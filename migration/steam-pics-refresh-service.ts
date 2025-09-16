import SteamUser from 'steam-user';
import config from '../config';
import { driver as neo4jDriver } from '../neo4j/client';
import { GameDocument, WebApiData } from '../types/steam.types';

const steamUser = new SteamUser();
steamUser.setOptions({
    enablePicsCache: true,
    changelistUpdateInterval: 0
});

const STEAM_API_KEY = config.steamApiKeys[config.worker.id] || config.steamApiKey;

if (!STEAM_API_KEY) {
    throw new Error(`[Worker ${config.worker.id}] Steam API key is missing. Ensure STEAM_API_KEY_${config.worker.id} or a fallback STEAM_API_KEY is defined in your .env file.`);
}

const STEAM_API_BASE_URL = "https://store.steampowered.com/api/appdetails";
const REVIEW_API_BASE_URL = "https://store.steampowered.com/appreviews";
const GAMES_PER_MINUTE_LIMIT = 13;
const DELAY_MS = 60000 / GAMES_PER_MINUTE_LIMIT;
const STATE_DOCUMENT_ID = 'steam_changenumber';

async function fetchWithRetry(url: string, retries: number = 3, backoff: number = 1000): Promise<Response> {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                return response;
            }
            if (response.status >= 400 && response.status < 500) {
                 console.warn(`Request to ${url.replace(STEAM_API_KEY!, 'YOUR_STEAM_KEY')} failed with status ${response.status}. Not retrying.`);
                 const errorBody = await response.text();
                 console.warn(`Steam API Error Body: ${errorBody}`);
                 return response;
            }
             console.warn(`Request to ${url.replace(STEAM_API_KEY!, 'YOUR_STEAM_KEY')} failed with status ${response.status}. Retrying in ${backoff / 1000}s...`);
        } catch (error: any) {
            console.warn(`Request to ${url.replace(STEAM_API_KEY!, 'YOUR_STEAM_KEY')} failed with error: ${error.message}. Retrying in ${backoff / 1000}s...`);
        }
        await new Promise(resolve => setTimeout(resolve, backoff));
        backoff *= 2;
    }
    throw new Error(`Failed to fetch from ${url} after ${retries} attempts.`);
}

async function getLatestChangenumber(): Promise<number> {
    const session = neo4jDriver.session();
    try {
        const result = await session.run(`
            MATCH (s:SteamSyncState {id: $id})
            RETURN s.changenumber as changenumber
        `, { id: STATE_DOCUMENT_ID });

        if (result.records.length > 0) {
            return result.records[0].get('changenumber').low;
        }
        return 0;
    } finally {
        await session.close();
    }
}

async function saveLatestChangenumber(changenumber: number) {
    const session = neo4jDriver.session();
    try {
        await session.run(`
            MERGE (s:SteamSyncState {id: $id})
            SET s.changenumber = $changenumber
        `, { id: STATE_DOCUMENT_ID, changenumber });
        console.log(`Successfully saved new changenumber: ${changenumber}`);
    } catch (error: unknown) {
        console.error(`Error saving new changenumber ${changenumber}:`, error);
    } finally {
        await session.close();
    }
}

interface ProductChanges {
    currentChangenumber: number;
    appChanges: { appid: number; change_number: number; needs_token: boolean; }[];
    packageChanges: any[];
}

function formatPicsDataToGameDocument(appId: number, picsData: any): Partial<GameDocument> {
    const common = picsData.appinfo?.common ?? {};
    const developers: string[] = [], publishers: string[] = [];
    if (common.associations) {
        Object.values(common.associations).forEach((assoc: any) => {
            if (assoc.type === 'developer') developers.push(assoc.name);
            else if (assoc.type === 'publisher') publishers.push(assoc.name);
        });
    }

    const oslist = common.oslist?.split(',') || [];
    
    let releaseDateForDb: string | null = null;
    const steamReleaseTimestamp = common.steam_release_date;
    if (steamReleaseTimestamp) {
        const parsedDate = new Date(parseInt(steamReleaseTimestamp, 10) * 1000);
        if (!isNaN(parsedDate.getTime())) {
            releaseDateForDb = parsedDate.toISOString();
        }
    }

    const tags = common.store_tags ? Object.values(common.store_tags) as string[] : [];
    const categories = common.category ? Object.keys(common.category) : [];
    const hasSteamAchievements = categories.includes("category_22");

    let headerImageUrl: string | null = null;
    if (common.header_image?.english) {
        headerImageUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/${common.header_image.english}`;
    }

    return {
        steam_appid: appId,
        name: common.name,
        last_updated: new Date().toISOString(),
        steam_app_type: common.type?.toLowerCase() ?? 'unknown',
        developers: developers.length > 0 ? developers : null,
        publishers: publishers.length > 0 ? publishers : null,
        release_date: releaseDateForDb,
        header_image: headerImageUrl,
        platforms_windows: oslist.includes('windows'),
        platforms_mac: oslist.includes('macos'),
        platforms_linux: oslist.includes('linux'),
        tags: tags.length > 0 ? tags : null,
        categories: categories.length > 0 ? categories : null,
        has_steam_achievements: hasSteamAchievements,
        controller_support: common.controller_support ?? null,
        metacritic_score: common.metacritic?.score ?? null,
        metacritic_url: common.metacritic?.url ?? null,
        is_early_access: common.releasestate === 'prerelease',
        short_description: null,
        total_reviews: null,
        price_final: null,
        price_currency: null,
        price_initial: null,
        discount_percent: null,
        total_positive: null,
        total_negative: null,
        review_score_desc: null,
        current_players: null,
        positive_rating_percentage: common.review_percentage ? parseInt(common.review_percentage, 10) : null,
    };
}

async function fetchGameDetailsFromWebAPI(steamAppId: number): Promise<WebApiData | null> {
  const appDetailsUrl = `${STEAM_API_BASE_URL}?appids=${steamAppId}&key=${STEAM_API_KEY}`;
  const reviewUrl = `${REVIEW_API_BASE_URL}/${steamAppId}?json=1&purchase_type=all`;
  const playersUrl = `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${steamAppId}`;

  try {
    const [appDetailsResponse, reviewResponse, playersResponse] = await Promise.all([
      fetchWithRetry(appDetailsUrl),
      fetchWithRetry(reviewUrl),
      fetchWithRetry(playersUrl),
    ]);
    
    if (!appDetailsResponse.ok) {
      console.error(`Web API request failed for appid ${steamAppId}: ${appDetailsResponse.status} ${appDetailsResponse.statusText}`);
      return null;
    }
    
    const appDetailsJson = await appDetailsResponse.json();
    const appDetails = appDetailsJson[steamAppId];

    if (!appDetails?.success) {
        console.warn(`Web API indicated unsuccessful fetch for appid ${steamAppId}.`);
        return null;
    }

    const gameData: WebApiData = appDetails.data;

    if (reviewResponse.ok) {
        const reviewJson = await reviewResponse.json();
        if (reviewJson.success) {
            gameData.review_summary = reviewJson.query_summary;
        }
    }
    
    if (playersResponse.ok) {
        const playersJson = await playersResponse.json();
        if (playersJson.response?.result === 1) {
            gameData.player_count = playersJson.response.player_count;
        }
    }

    return gameData;

  } catch (error) {
    console.error(`Error fetching game details for appid ${steamAppId} from Web API:`, error);
    return null;
  }
}

function mergeApiData(picsData: Partial<GameDocument>, webData: WebApiData | null): Partial<GameDocument> {
    const mergedData = { ...picsData };

    if (!webData) {
        return mergedData;
    }

    const reviews = webData.review_summary;
    const price = webData.price_overview;

    mergedData.short_description = webData.short_description ?? mergedData.short_description;
    mergedData.total_reviews = reviews?.total_reviews ?? null;
    mergedData.price_final = price?.final ?? null;
    mergedData.price_currency = price?.currency ?? null;
    mergedData.price_initial = price?.initial ?? null;
    mergedData.discount_percent = price?.discount_percent ?? null;
    mergedData.total_positive = reviews?.total_positive ?? null;
    mergedData.total_negative = reviews?.total_negative ?? null;
    mergedData.review_score_desc = reviews?.review_score_desc ?? null;
    mergedData.current_players = webData.player_count ?? null;
    mergedData.metacritic_score = webData.metacritic?.score ?? mergedData.metacritic_score;
    mergedData.metacritic_url = webData.metacritic?.url ?? mergedData.metacritic_url;
    mergedData.genres = webData.genres ? webData.genres.map(g => g.description) : null;
    mergedData.detailed_description = webData.detailed_description ?? null;
    mergedData.about_the_game = webData.about_the_game ?? null;
    mergedData.website = webData.website ?? null;
    mergedData.screenshots = webData.screenshots ? webData.screenshots.map(s => s.path_full) : null;
    mergedData.movies = webData.movies ? webData.movies.map(m => m.mp4.max) : null;
    mergedData.is_free = webData.is_free ?? false;
    mergedData.pc_requirements = webData.pc_requirements ?? null;
    mergedData.mac_requirements = webData.mac_requirements ?? null;
    mergedData.linux_requirements = webData.linux_requirements ?? null;
    mergedData.supported_languages = webData.supported_languages ?? null;
    mergedData.dlc = webData.dlc ?? null;
    mergedData.required_age = webData.required_age ?? null;

    if (reviews?.total_reviews && reviews.total_reviews > 0) {
        mergedData.positive_rating_percentage = Math.round((reviews.total_positive / reviews.total_reviews) * 100);
    }

    return mergedData;
}

async function performRefresh() {
    console.log("Steam PICS refresh service started.");

    console.log("Logging into Steam anonymously...");
    steamUser.logOn({ anonymous: true });

    await new Promise<void>((resolve, reject) => {
        steamUser.on('loggedOn', () => {
            console.log(`Logged into Steam successfully.`);
            resolve();
        });
        steamUser.on('error', (err) => {
            console.error(`Steam login error:`, err);
            reject(err);
        });
    });

    const lastChangenumber = await getLatestChangenumber();
    console.log(`Last known changenumber is ${lastChangenumber}. Fetching changes...`);

    const productChanges = await new Promise<ProductChanges>((resolve, reject) => {
        steamUser.getProductChanges(lastChangenumber, (err, currentChangenumber, appChanges, packageChanges) => {
            if (err) {
                return reject(err);
            }
            resolve({ currentChangenumber, appChanges, packageChanges });
        });
    });

    const { currentChangenumber, appChanges } = productChanges;

    if (currentChangenumber <= lastChangenumber) {
        console.log(`Steam changenumber (${currentChangenumber}) has not advanced past local changenumber (${lastChangenumber}). No changes to fetch.`);
        return;
    }

    if (appChanges.length === 0) {
        console.log(`No new app changes from Steam, but changenumber has updated from ${lastChangenumber} to ${currentChangenumber}.`);
        await saveLatestChangenumber(currentChangenumber);
        console.log("Database changenumber updated. Exiting.");
        return;
    }

    console.log(`Received ${appChanges.length} app changes. Current changenumber is ${currentChangenumber}.`);

    const allAppIdsToProcess = appChanges.map((app: { appid: number; }) => app.appid);

    if (allAppIdsToProcess.length > 0) {
        const apps = await new Promise<{ [key: string]: any }>((resolve, reject) => {
            steamUser.getProductInfo(allAppIdsToProcess, [], false, (err: Error | null, apps: { [key: string]: any }) => {
                if (err) {
                    return reject(new Error('Failed to get product info from Steam: ' + err.message));
                }
                resolve(apps);
            });
        });

        const appIdsWithData = Object.keys(apps).map(id => parseInt(id, 10));
        let processedCount = 0;

        for (const appId of appIdsWithData) {
            processedCount++;
            const picsData = apps[appId];

            if (picsData.appinfo) {
                const formattedPicsData = formatPicsDataToGameDocument(appId, picsData);

                if (formattedPicsData.steam_app_type !== 'game') {
                    console.log(`(${processedCount}/${appIdsWithData.length}) Skipping appid ${appId} as it is a '${formattedPicsData.steam_app_type}', not a game.`);
                    continue;
                }

                const webApiData = await fetchGameDetailsFromWebAPI(appId);
                const finalGameData = mergeApiData(formattedPicsData, webApiData);

                const session = neo4jDriver.session();
                try {
                    await session.run(`
                        MERGE (g:Game {steam_appid: $steam_appid})
                        SET g += $props
                    `, { steam_appid: appId, props: finalGameData });
                    console.log(`(${processedCount}/${appIdsWithData.length}) Successfully created/updated game: ${finalGameData.name} (${finalGameData.steam_appid})`);
                } catch (e) {
                    console.error(`Error processing game ${finalGameData.name} in database:`, e);
                } finally {
                    await session.close();
                }
            } else {
                console.log(`(${processedCount}/${appIdsWithData.length}) Ignored new appid ${appId} as it has no PICS info.`);
            }

            if (processedCount < appIdsWithData.length) {
                console.log(`Waiting ${Math.round(DELAY_MS / 1000)}s before next game...`);
                await new Promise(resolve => setTimeout(resolve, DELAY_MS));
            }
        }
    }
    
    await saveLatestChangenumber(currentChangenumber);
    console.log(`
Steam PICS refresh completed.`);
}

async function runPicsRefreshService() {
    let exitCode = 0;
    try {
        await performRefresh();
    } catch (e) {
        const error = e as Error;
        console.error(`Error in Steam PICS refresh service:`, error.message);
        console.error(error.stack);
        exitCode = 1;
    } finally {
        steamUser.logOff();
        process.exit(exitCode);
    }
}

void runPicsRefreshService();
