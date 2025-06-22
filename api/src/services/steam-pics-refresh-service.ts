import { Client, Databases, Query, ID } from 'node-appwrite';
import SteamUser from 'steam-user';
import config from '../config';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const client = new Client();
client
    .setEndpoint(config.appwrite.endpoint!)
    .setProject(config.appwrite.projectId!)
    .setKey(config.appwrite.apiKey!);

const databases = new Databases(client);
const steamUser = new SteamUser();
steamUser.setOptions({
    enablePicsCache: true, // Required for getProductInfo
    changelistUpdateInterval: 0 // We don't need automatic updates
});

const STEAM_API_KEY = config.steamApiKeys[config.worker.id] || config.steamApiKey;

if (!STEAM_API_KEY) {
    throw new Error(`[Worker ${config.worker.id}] Steam API key is missing. Ensure STEAM_API_KEY_${config.worker.id} or a fallback STEAM_API_KEY is defined in your .env file.`);
}

const STEAM_API_BASE_URL = "https://store.steampowered.com/api/appdetails";
const REVIEW_API_BASE_URL = "https://store.steampowered.com/appreviews";
const GAMES_PER_MINUTE_LIMIT = 13; // Each game update can be 3-5 API calls. With a 100k/day limit (~69/min), this is a safe throttle.
const DELAY_MS = 60000 / GAMES_PER_MINUTE_LIMIT;
const STATE_DOCUMENT_ID = 'steam_changenumber';

interface GameDocument {
  steam_appid: number;
  name: string;
  short_description?: string | null;
  header_image?: string | null;
  release_date?: string | null; 
  last_updated: string;
  developers?: string[] | null;
  publishers?: string[] | null;
  is_early_access?: boolean | null;
  total_reviews?: number | null;
  steam_app_type?: string | null;
  price_final?: number | null;
  price_currency?: string | null;
  price_initial?: number | null;
  discount_percent?: number | null;
  total_positive?: number | null;
  total_negative?: number | null;
  review_score_desc?: string | null;
  current_players?: number | null;
  tags?: string[] | null;
  controller_support?: string | null;
  metacritic_score?: number | null;
  metacritic_url?: string | null;
  platforms_windows?: boolean | null;
  platforms_mac?: boolean | null;
  platforms_linux?: boolean | null;
  categories?: string[] | null;
  has_steam_achievements?: boolean | null;
  positive_rating_percentage?: number | null;
}

// Define a type for the Steam API's game data to avoid using 'any'
interface SteamGameData {
  type: string;
  name: string;
  steam_appid: number;
  short_description: string;
  header_image: string;
  release_date: {
    coming_soon: boolean;
    date: string;
  };
  developers: string[];
  publishers: string[];
  price_overview?: {
    currency: string;
    initial: number;
    final: number;
    discount_percent: number;
  };
  genres: { id: string; description:string }[];
  recommendations?: {
    total: number;
    positive: number;
    negative: number;
    review_score_desc: string;
  };
  player_count?: number;
  pics_info?: any; // To hold data from node-steam-user
  metacritic?: {
    score: number;
    url: string;
  };
  platforms?: {
    windows: boolean;
    mac: boolean;
    linux: boolean;
  };
  categories?: { id: number; description: string }[];
  achievements?: {
    total: number;
  };
}

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

async function fetchGameDetailsFromSteam(steamAppId: number): Promise<{ data: SteamGameData | null, type: string | null }> {
  const appDetailsUrl = `${STEAM_API_BASE_URL}?appids=${steamAppId}&key=${STEAM_API_KEY}`;
  const reviewUrl = `${REVIEW_API_BASE_URL}/${steamAppId}?json=1&purchase_type=all`;
  const playersUrl = `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${steamAppId}`;

  console.log(`Fetching app details from: ${appDetailsUrl.replace(STEAM_API_KEY!, 'YOUR_STEAM_KEY')}`);
  console.log(`Fetching reviews from: ${reviewUrl}`);
  console.log(`Fetching player count from: ${playersUrl}`);
  console.log(`Fetching PICS data for: ${steamAppId}`);

  try {
    const productInfoPromise = new Promise<{ err: Error | null; apps: any; packages: any; }>((resolve) => {
        steamUser.getProductInfo([steamAppId], [], false, (err, apps, packages) => {
            resolve({ err, apps, packages });
        });
    });

    const [appDetailsResponse, reviewResponse, playersResponse, picsResponse] = await Promise.all([
      fetchWithRetry(appDetailsUrl),
      fetchWithRetry(reviewUrl),
      fetchWithRetry(playersUrl),
      productInfoPromise
    ]);

    if (!appDetailsResponse.ok) {
      console.error(
        `Steam API request failed for appid ${steamAppId}: ${appDetailsResponse.status} ${appDetailsResponse.statusText}`
      );
      const errorBody = await appDetailsResponse.text();
      console.error(`Steam API Error Body: ${errorBody}`);
      return { data: null, type: 'error' };
    }
    
    const appDetailsData = await appDetailsResponse.json();
    let reviewData = null;
    let playersData = null;

    if (reviewResponse.ok) {
        const reviewJson = await reviewResponse.json();
        if (reviewJson.success) {
            reviewData = reviewJson.query_summary;
        } else {
            console.warn(`Could not fetch review data for appid ${steamAppId}.`);
        }
    } else {
        console.warn(`Review API request failed for appid ${steamAppId}: ${reviewResponse.status} ${reviewResponse.statusText}`);
    }

    if (playersResponse.ok) {
        const playersJson = await playersResponse.json();
        if (playersJson.response && playersJson.response.result === 1) {
            playersData = playersJson.response;
        }
    } else {
        console.warn(`Player count API request failed for appid ${steamAppId}: ${playersResponse.status} ${playersResponse.statusText}`);
    }

    if (appDetailsData && appDetailsData[steamAppId]) {
      const details = appDetailsData[steamAppId];
      if (details.success) {
        const gameData = details.data;
        const appType = gameData.type || 'game'; // Default to 'game' if type is missing

        if (appType !== 'game') {
           console.log(`AppID ${steamAppId} is a '${appType}', not a game. Skipping full data processing.`);
           return { data: null, type: appType };
        }

        if (reviewData) {
          gameData.recommendations = { 
              total: reviewData.total_reviews,
              positive: reviewData.total_positive,
              negative: reviewData.total_negative,
              review_score_desc: reviewData.review_score_desc
          };
        }

        if (playersData) {
            gameData.player_count = playersData.player_count;
        }
        
        if (picsResponse.err) {
            console.warn(`Could not fetch PICS data for ${steamAppId}:`, picsResponse.err.message);
        } else {
            gameData.pics_info = picsResponse.apps[steamAppId];
        }

        return { data: gameData, type: 'game' };

      } else {
        console.warn(`Steam indicated unsuccessful fetch for appid ${steamAppId}. Marking as invalid.`);
        return { data: null, type: 'invalid' };
      }
    }

    console.warn(`No data or unexpected response structure for appid ${steamAppId} from Steam.`);
    return { data: null, type: null };
  } catch (error) {
    console.error(`Error fetching game details for appid ${steamAppId} from Steam:`, error);
    return { data: null, type: 'error' };
  }
}

async function recordReviewHistory(documentId: string, totalReviews: number) {
    if (typeof totalReviews !== 'number') return; // Don't record if no review data

    const historyData = {
        game_id: documentId,
        date: new Date().toISOString(),
        total_reviews: totalReviews,
    };

    try {
        await databases.createDocument(
            config.appwrite.databaseId!,
            'review_history',
            ID.unique(),
            historyData
        );
        console.log(`Successfully recorded review history for document ${documentId}.`);
    } catch (error) {
        console.error(`Error recording review history for document ${documentId}:`, error);
    }
}

async function updateGameInAppwrite(documentId: string, steamData: SteamGameData | null, steamAppType: string) {
    if (steamData && steamAppType === 'game') {
        // This is a valid game, do a full update
        const isEarlyAccess = steamData.genres?.some(
            (genre: { id: string; description: string }) => genre.description === "Early Access"
        ) ?? false;

        let releaseDateForDb: string | undefined;
        const steamReleaseDate = steamData.release_date;

        if (steamReleaseDate && !steamReleaseDate.coming_soon && steamReleaseDate.date) {
            const parsedDate = new Date(steamReleaseDate.date);
            if (!isNaN(parsedDate.getTime())) {
                releaseDateForDb = parsedDate.toISOString();
            } else {
                console.warn(`Could not parse '${steamReleaseDate.date}' as a date for game '${steamData.name}'. Release date will be left unchanged.`);
            }
        } else if (steamReleaseDate?.coming_soon) {
            console.log(`'${steamData.name}' is marked as 'coming soon', release date will not be set.`);
        }

        const price = steamData.price_overview;
        const reviews = steamData.recommendations;
        const picsInfo = steamData.pics_info?.appinfo;
        const categories = steamData.categories?.map(c => c.description) ?? [];
        const hasSteamAchievements = categories.includes("Steam Achievements");

        let tags: string[] | undefined;
        if (picsInfo?.common?.tags) {
            tags = Object.values(picsInfo.common.tags);
        }

        const gameData: Partial<GameDocument> = {
            name: steamData.name,
            short_description: steamData.short_description,
            header_image: steamData.header_image,
            release_date: releaseDateForDb ?? null,
            last_updated: new Date().toISOString(),
            developers: steamData.developers,
            publishers: steamData.publishers,
            is_early_access: isEarlyAccess,
            total_reviews: reviews?.total ?? null,
            steam_app_type: 'game',
            // New analytics fields
            price_final: price?.final ?? null,
            price_currency: price?.currency ?? null,
            price_initial: price?.initial ?? null,
            discount_percent: price?.discount_percent ?? null,
            total_positive: reviews?.positive ?? null,
            total_negative: reviews?.negative ?? null,
            positive_rating_percentage: reviews?.total && reviews?.total > 0 ? Math.round((reviews.positive / reviews.total) * 100) : null,
            review_score_desc: reviews?.review_score_desc ?? null,
            current_players: steamData.player_count ?? null,
            // From PICS
            tags: tags ?? null,
            controller_support: picsInfo?.common?.controller_support ?? null,
            // New Features
            metacritic_score: steamData.metacritic?.score ?? null,
            metacritic_url: steamData.metacritic?.url ?? null,
            platforms_windows: steamData.platforms?.windows ?? null,
            platforms_mac: steamData.platforms?.mac ?? null,
            platforms_linux: steamData.platforms?.linux ?? null,
            categories: categories.length > 0 ? categories : null,
            has_steam_achievements: hasSteamAchievements,
        };

        try {
            await databases.updateDocument(
                config.appwrite.databaseId!,
                config.appwrite.gamesCollectionId!,
                documentId,
                gameData
            );
            console.log(`Successfully updated game ${steamData.name}`);
            
            if (hasSteamAchievements) {
              console.log(`Game ${steamData.name} has achievements. Syncing...`);
              await syncGameAchievements(documentId, steamData.steam_appid);
            }

            // After successful update, record the review count for trend analysis
            if (reviews?.total) {
              await recordReviewHistory(documentId, reviews.total);
            }

            return true;
        } catch (error) {
            console.error(`Error updating game ${steamData.name} in Appwrite:`, error);
            return false;
        }
    } else {
        // This is not a game (demo, dlc, invalid, etc.)
        // Just mark it so we don't check it again.
        const gameData: Partial<GameDocument> = {
            last_updated: new Date().toISOString(),
            steam_app_type: steamAppType,
        };
        try {
            await databases.updateDocument(
                config.appwrite.databaseId!,
                config.appwrite.gamesCollectionId!,
                documentId,
                gameData
            );
            console.log(`Marked document ${documentId} as type '${steamAppType}'. It will be skipped in future updates.`);
            return false; // Return false because it wasn't a "successful game update"
        } catch (error) {
            console.error(`Error marking document ${documentId} as '${steamAppType}':`, error);
            return false;
        }
    }
}

async function getLatestChangenumber(): Promise<number> {
    try {
        const doc = await databases.getDocument(config.appwrite.databaseId!, 'steam_state', STATE_DOCUMENT_ID);
        return doc.changenumber;
    } catch (error: any) {
        if (error.code === 404) {
            console.log('Changenumber document not found, will start from scratch.');
            return 0;
        }
        throw error;
    }
}

async function saveLatestChangenumber(changenumber: number) {
    try {
        await databases.updateDocument(config.appwrite.databaseId!, 'steam_state', STATE_DOCUMENT_ID, { changenumber });
        console.log(`Successfully saved new changenumber: ${changenumber}`);
    } catch (error: any) {
        if (error.code === 404) {
            console.log('Changenumber document not found, creating a new one.');
            await databases.createDocument(config.appwrite.databaseId!, 'steam_state', STATE_DOCUMENT_ID, { changenumber });
            console.log(`Successfully created and saved new changenumber: ${changenumber}`);
        } else {
            console.error(`Error saving new changenumber ${changenumber}:`, error);
        }
    }
}

interface ProductChanges {
    currentChangenumber: number;
    appChanges: { appid: number; change_number: number; needs_token: boolean; }[];
    packageChanges: any[];
}

function formatPicsDataToGameDocument(appId: number, picsData: any): Partial<GameDocument> {
    const common = picsData.appinfo?.common ?? {};
    const extended = picsData.appinfo?.extended ?? {};
    
    const developers: string[] = [];
    const publishers: string[] = [];
    if (common.associations) {
        Object.values(common.associations).forEach((assoc: any) => {
            if (assoc.type === 'developer') {
                developers.push(assoc.name);
            } else if (assoc.type === 'publisher') {
                publishers.push(assoc.name);
            }
        });
    }

    const oslist = common.oslist?.split(',') || [];
    
    let releaseDateForDb: string | null = null;
    const steamReleaseTimestamp = common.steam_release_date;
    if (steamReleaseTimestamp) {
        // The timestamp is in seconds, so we multiply by 1000 for milliseconds
        const parsedDate = new Date(parseInt(steamReleaseTimestamp, 10) * 1000);
        if (!isNaN(parsedDate.getTime())) {
            releaseDateForDb = parsedDate.toISOString();
        }
    }

    // PICS provides tag IDs. The actual names aren't in this response.
    const tags = common.store_tags ? Object.values(common.store_tags) as string[] : [];
    
    // PICS provides category IDs in the format "category_X". We'll store them as is.
    const categories = common.category ? Object.keys(common.category) : [];
    const hasSteamAchievements = categories.includes("category_22"); // Category 22 is "Steam Achievements"

    let headerImageUrl: string | null = null;
    if (common.header_image?.english) {
        headerImageUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/${common.header_image.english}`;
    }

    return {
        steam_appid: appId,
        name: common.name,
        last_updated: new Date().toISOString(),
        steam_app_type: common.type?.toLowerCase() ?? 'unknown',
        
        // From PICS 'common'
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

        // Fields not available in getProductInfo that were in the old method
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
        
        // Fields available in PICS but not the old method
        positive_rating_percentage: common.review_percentage ? parseInt(common.review_percentage, 10) : null,
    };
}

interface WebApiData {
    type: string;
    name: string;
    steam_appid: number;
    short_description: string;
    header_image: string;
    release_date: {
      coming_soon: boolean;
      date: string;
    };
    developers: string[];
    publishers: string[];
    price_overview?: {
      currency: string;
      initial: number;
      final: number;
      discount_percent: number;
    };
    metacritic?: {
        score: number;
        url: string;
    };
    platforms?: {
        windows: boolean;
        mac: boolean;
        linux: boolean;
    };
    categories?: { id: number; description: string }[];
    achievements?: {
        total: number;
    };
    // From other endpoints
    review_summary?: any;
    player_count?: number;
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
    
    mergedData.total_reviews = reviews?.total_reviews ?? null,
    mergedData.price_final = price?.final ?? null,
    mergedData.price_currency = price?.currency ?? null,
    mergedData.price_initial = price?.initial ?? null,
    mergedData.discount_percent = price?.discount_percent ?? null,
    mergedData.total_positive = reviews?.total_positive ?? null,
    mergedData.total_negative = reviews?.total_negative ?? null,
    mergedData.review_score_desc = reviews?.review_score_desc ?? null,
    mergedData.current_players = webData.player_count ?? null,
    
    // Web API sometimes has better metacritic data
    mergedData.metacritic_score = webData.metacritic?.score ?? mergedData.metacritic_score;
    mergedData.metacritic_url = webData.metacritic?.url ?? mergedData.metacritic_url;

    // The positive rating percentage can be calculated more accurately from web data
    if (reviews?.total_reviews && reviews.total_reviews > 0) {
        mergedData.positive_rating_percentage = Math.round((reviews.total_positive / reviews.total_reviews) * 100);
    }

    return mergedData;
}

async function runPicsRefreshService() {
  console.log("Steam PICS refresh service started.");
  let totalUpdatedCount = 0;

  try {
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
            if (err) return reject(err);
            resolve({ currentChangenumber, appChanges, packageChanges });
        });
    });

    const { currentChangenumber, appChanges } = productChanges;

    if (appChanges.length === 0 && currentChangenumber === lastChangenumber) {
        console.log("No new changes from Steam. Exiting.");
        steamUser.logOff();
        return;
    }
    
    console.log(`Received ${appChanges.length} app changes. Current changenumber is ${currentChangenumber}.`);

    const appIdsToUpdate = appChanges.map(app => app.appid);

    if (appIdsToUpdate.length > 0) {
        // Find which of the changed AppIDs exist in our database
        const CHUNK_SIZE = 100;
        const gameDocsByAppId = new Map();
        for (let i = 0; i < appIdsToUpdate.length; i += CHUNK_SIZE) {
            const chunk = appIdsToUpdate.slice(i, i + CHUNK_SIZE);
            const response = await databases.listDocuments(
                config.appwrite.databaseId!,
                config.appwrite.gamesCollectionId!,
                [Query.equal('steam_appid', chunk), Query.limit(CHUNK_SIZE)]
            );
            response.documents.forEach(doc => gameDocsByAppId.set(doc.steam_appid, doc));
        }
        
        const appIdsInDb = Array.from(gameDocsByAppId.keys());
        console.log(`Found ${appIdsInDb.length} games in the database that require an update. Fetching data...`);

        if (appIdsInDb.length > 0) {
            steamUser.getProductInfo(appIdsInDb, [], false, async (err: Error | null, apps: { [key: string]: any }, packages: any) => {
                if (err) {
                    console.error('Failed to get product info from Steam:', err);
                    steamUser.logOff();
                    return;
                }

                const appIdsToProcess = Object.keys(apps);
                const appCount = appIdsToProcess.length;
                let processedCount = 0;

                for (const appIdStr of appIdsToProcess) {
                    processedCount++;
                    const appId = parseInt(appIdStr, 10);
                    const picsData = apps[appIdStr];
                    const gameDoc = gameDocsByAppId.get(appId);

                    if (gameDoc && picsData.appinfo) {
                        const formattedPicsData = formatPicsDataToGameDocument(appId, picsData);
                        const webApiData = await fetchGameDetailsFromWebAPI(appId);
                        
                        const finalGameData = mergeApiData(formattedPicsData, webApiData);

                        try {
                             await databases.updateDocument(
                                config.appwrite.databaseId!,
                                config.appwrite.gamesCollectionId!,
                                gameDoc.$id,
                                finalGameData
                            );
                            console.log(`(${processedCount}/${appCount}) Successfully updated game: ${finalGameData.name} (${finalGameData.steam_appid})`);
                            totalUpdatedCount++;
                            await incrementStat('updatedGames');

                            if (finalGameData.has_steam_achievements) {
                                console.log(`Game ${finalGameData.name} has achievements. Syncing...`);
                                await syncGameAchievements(gameDoc.$id, appId);
                            }

                        } catch (e) {
                            console.error(`Error updating game ${finalGameData.name} in Appwrite:`, e);
                        }
                    } else {
                        const gameDoc = gameDocsByAppId.get(appId);
                        if (gameDoc) {
                            const updatePayload: Partial<GameDocument> = {
                                last_updated: new Date().toISOString(),
                                steam_app_type: 'invalid',
                            };
                            await databases.updateDocument(config.appwrite.databaseId!, config.appwrite.gamesCollectionId!, gameDoc.$id, updatePayload);
                            console.log(`(${processedCount}/${appCount}) Marked appid ${appId} as invalid as no PICS info was returned.`);
                        }
                    }

                    if (processedCount < appCount) {
                        console.log(`Waiting ${Math.round(DELAY_MS / 1000)}s before next game...`);
                        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
                    }
                }
                
                console.log(`\nUpdate process finished. ${totalUpdatedCount} games were updated.`);
                await saveLatestChangenumber(currentChangenumber);
                console.log(`\nSteam PICS refresh completed.`);
                steamUser.logOff();
            });
        } else {
             await saveLatestChangenumber(currentChangenumber);
             console.log(`No games in the database matched the list of changes. Changenumber updated. Exiting.`);
             steamUser.logOff();
        }
    } else {
        await saveLatestChangenumber(currentChangenumber);
        console.log(`No app changes from Steam, but changenumber updated. Exiting.`);
        steamUser.logOff();
    }
  } catch (e) {
    const error = e as Error;
    console.error(`Error in Steam PICS refresh service:`, error.message);
    console.error(error.stack);
    steamUser.logOff();
    process.exit(1);
  }
}

async function incrementStat(key: string, incrementBy: number = 1) {
    const dbId = config.appwrite.databaseId!;
    const statsCollectionId = 'statistics';
    try {
        const existing = await databases.listDocuments(dbId, statsCollectionId, [Query.equal('key', key)]);
        if (existing.documents.length > 0) {
            const doc = existing.documents[0];
            const newCount = doc.count + incrementBy;
            await databases.updateDocument(dbId, statsCollectionId, doc.$id, { count: newCount });
        }
    } catch (e) {
        console.error(`\nFailed to increment stat for key: ${key}. Error: ${e}`);
    }
}

interface Achievement {
    name: string; // This is the API name
    displayName: string;
    description: string;
    hidden: boolean;
    icon: string;
    icongray: string;
    percent?: number; // from the global stats endpoint
}

interface AchievementDocument {
    game_id: string; // FK to games collection document $id
    steam_appid: number;
    api_name: string;
    display_name: string;
    description?: string | null;
    icon?: string | null;
    icon_gray?: string | null;
    hidden?: boolean | null;
    global_percentage?: number | null;
}

async function syncGameAchievements(documentId: string, steamAppId: number) {
    const schemaUrl = `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${STEAM_API_KEY}&appid=${steamAppId}&l=english`;
    const percentagesUrl = `https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid=${steamAppId}`;

    try {
        const [schemaResponse, percentagesResponse] = await Promise.all([
            fetchWithRetry(schemaUrl),
            fetchWithRetry(percentagesUrl)
        ]);

        if (!schemaResponse.ok) {
            console.warn(`Could not fetch achievement schema for appid ${steamAppId}. Status: ${schemaResponse.status}`);
            return;
        }

        const schemaData = await schemaResponse.json();
        const achievements: Achievement[] = schemaData.game?.availableGameStats?.achievements ?? [];

        if (achievements.length === 0) {
            console.log(`No achievements found for appid ${steamAppId}.`);
            return;
        }

        const percentagesData: any = {};
        if (percentagesResponse.ok) {
            const percentagesJson = await percentagesResponse.json();
            if (percentagesJson?.achievementpercentages?.achievements) {
                percentagesJson.achievementpercentages.achievements.forEach((ach: { name: string; percent: any }) => {
                    const percentValue = parseFloat(ach.percent);
                    if (!isNaN(percentValue)) {
                        percentagesData[ach.name] = percentValue;
                    } else {
                        console.warn(`Could not parse achievement percent for ${ach.name} as a float. Value was: ${ach.percent}`);
                    }
                });
            }
        } else {
            console.warn(`Could not fetch achievement percentages for appid ${steamAppId}.`);
        }

        const achievementsToCreate: AchievementDocument[] = achievements.map(ach => ({
            game_id: documentId,
            steam_appid: steamAppId,
            api_name: ach.name,
            display_name: ach.displayName,
            description: ach.description || null,
            icon: ach.icon || null,
            icon_gray: ach.icongray || null,
            hidden: !!ach.hidden,
            global_percentage: percentagesData[ach.name] ?? null,
        }));

        // Delete all old achievements for the game to ensure data is fresh
        const oldAchievementsToDelete = [];
        let hasMore = true;
        let cursor;
        while (hasMore) {
            const queries: any[] = [Query.equal('steam_appid', steamAppId), Query.limit(100)];
            if (cursor) {
                queries.push(Query.cursorAfter(cursor));
            }
            const oldAchievements = await databases.listDocuments(config.appwrite.databaseId!, 'achievements', queries);
            
            if (oldAchievements.documents.length > 0) {
                oldAchievementsToDelete.push(...oldAchievements.documents);
                cursor = oldAchievements.documents[oldAchievements.documents.length - 1].$id;
            } else {
                hasMore = false;
            }
        }
        
        if (oldAchievementsToDelete.length > 0) {
            console.log(`Deleting ${oldAchievementsToDelete.length} old achievements for appid ${steamAppId}.`);
            const deletePromises = oldAchievementsToDelete.map(doc =>
                databases.deleteDocument(config.appwrite.databaseId!, 'achievements', doc.$id)
            );
            await Promise.all(deletePromises);
        }
        
        // Create new ones in batches
        const BATCH_SIZE = 50;
        for (let i = 0; i < achievementsToCreate.length; i += BATCH_SIZE) {
            const batch = achievementsToCreate.slice(i, i + BATCH_SIZE);
            const createPromises = batch.map(ach => databases.createDocument(
                config.appwrite.databaseId!,
                'achievements',
                ID.unique(),
                ach
            ));
            await Promise.all(createPromises);
        }

        console.log(`Successfully synced ${achievementsToCreate.length} achievements for appid ${steamAppId}.`);

    } catch (error) {
        console.error(`Error syncing achievements for appid ${steamAppId}:`, error);
    }
}

async function testGetProductInfo(steamAppId: number) {
    console.log(`[Test] Fetching Product Info for AppID: ${steamAppId}`);
    
    return new Promise<void>((resolve, reject) => {
        steamUser.logOn({ anonymous: true });

        steamUser.on('loggedOn', () => {
            console.log('[Test] Logged into Steam successfully.');
            steamUser.getProductInfo([steamAppId], [], false, (err: Error | null, apps: { [key: string]: any }, packages: any) => {
                if (err) {
                    console.error('[Test] Error getting product info:', err);
                    steamUser.logOff();
                    return reject(err);
                }

                console.log('[Test] --- Raw PICS Response ---');
                console.log(JSON.stringify(apps[steamAppId], null, 2));
                
                steamUser.logOff();
                resolve();
            });
        });

        steamUser.on('error', (err) => {
            console.error('[Test] Steam login error:', err);
            reject(err);
        });
    });
}

// Autorun the service when the script is executed
if (require.main === module) {
    runPicsRefreshService();
}

export { runPicsRefreshService }; // Export if you plan to import it elsewhere 