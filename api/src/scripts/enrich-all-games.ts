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
    enablePicsCache: true,
    changelistUpdateInterval: 0
});

const workerId = parseInt(process.env.WORKER_ID || '0', 10);
const totalWorkers = parseInt(process.env.TOTAL_WORKERS || '1', 10);

const STEAM_API_KEY = config.steamApiKeys[workerId] || config.steamApiKey;
if (!STEAM_API_KEY) {
    throw new Error(`[Worker ${workerId}] Steam API key is missing. Ensure STEAM_API_KEY_${workerId} or a fallback STEAM_API_KEY is defined in your .env file.`);
}

const STEAM_API_BASE_URL = "https://store.steampowered.com/api/appdetails";
const REVIEW_API_BASE_URL = "https://store.steampowered.com/appreviews";
const GAMES_PER_MINUTE_LIMIT = 40; // Stay under the 100k/day Steam API limit
const DELAY_MS = 60000 / GAMES_PER_MINUTE_LIMIT;
let rateLimitRetryCount = 0; // State for exponential backoff on 429s


// --- Re-used Type Definitions & Functions from steam-pics-refresh-service ---

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

interface WebApiData {
    type: string;
    name: string;
    steam_appid: number;
    short_description: string;
    header_image: string;
    release_date: { coming_soon: boolean; date: string; };
    developers: string[];
    publishers: string[];
    price_overview?: { currency: string; initial: number; final: number; discount_percent: number; };
    metacritic?: { score: number; url: string; };
    platforms?: { windows: boolean; mac: boolean; linux: boolean; };
    categories?: { id: number; description: string }[];
    achievements?: { total: number; };
    review_summary?: any;
    player_count?: number;
}

async function fetchWithRetry(url: string, retries: number = 3, backoff: number = 1000): Promise<Response> {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                rateLimitRetryCount = 0; // Reset on a successful request
                return response;
            }
            
            if (response.status === 429) {
                const backoffMinutes = 5 * Math.pow(2, rateLimitRetryCount);
                rateLimitRetryCount++;
                console.warn(`[Worker ${workerId}] Rate limit hit (429). Pausing for ${backoffMinutes} minutes...`);
                await new Promise(resolve => setTimeout(resolve, backoffMinutes * 60 * 1000));
                i--; // This makes the loop retry the current attempt after the long pause
                continue;
            }

            if (response.status >= 400 && response.status < 500) {
                 console.warn(`Request to ${url.replace(STEAM_API_KEY!, 'YOUR_STEAM_KEY')} failed with status ${response.status}. Not retrying.`);
                 return response;
            }
             console.warn(`Request to ${url.replace(STEAM_API_KEY!, 'YOUR_STEAM_KEY')} failed with status ${response.status}. Retrying...`);
        } catch (error: any) {
            console.warn(`Request failed for ${url.replace(STEAM_API_KEY!, 'YOUR_STEAM_KEY')}: ${error.message}. Retrying...`);
        }
        await new Promise(resolve => setTimeout(resolve, backoff));
        backoff *= 2;
    }
    throw new Error(`Failed to fetch from ${url} after ${retries} attempts.`);
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
    
    if (!appDetailsResponse.ok) return null;
    const appDetailsJson = await appDetailsResponse.json();
    const appDetails = appDetailsJson[steamAppId];
    if (!appDetails?.success) return null;

    const gameData: WebApiData = appDetails.data;
    if (reviewResponse.ok) {
        const reviewJson = await reviewResponse.json();
        if (reviewJson.success) gameData.review_summary = reviewJson.query_summary;
    }
    if (playersResponse.ok) {
        const playersJson = await playersResponse.json();
        if (playersJson.response?.result === 1) gameData.player_count = playersJson.response.player_count;
    }
    return gameData;
  } catch (error) {
    console.error(`Error fetching from Web API for ${steamAppId}:`, error);
    return null;
  }
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
    const ts = common.steam_release_date;
    if (ts) releaseDateForDb = new Date(parseInt(ts, 10) * 1000).toISOString();
    
    const tags = common.store_tags ? Object.values(common.store_tags) as string[] : [];
    const categories = common.category ? Object.keys(common.category) : [];
    const has_steam_achievements = categories.includes("category_22");
    let headerImageUrl: string | null = null;
    if (common.header_image?.english) {
        headerImageUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/${common.header_image.english}`;
    }

    return {
        steam_appid: appId, name: common.name, last_updated: new Date().toISOString(), steam_app_type: common.type?.toLowerCase() ?? 'unknown',
        developers: developers.length > 0 ? developers : null, publishers: publishers.length > 0 ? publishers : null, release_date: releaseDateForDb,
        header_image: headerImageUrl, platforms_windows: oslist.includes('windows'), platforms_mac: oslist.includes('macos'), platforms_linux: oslist.includes('linux'),
        tags, categories, has_steam_achievements, controller_support: common.controller_support ?? null, metacritic_score: common.metacritic?.score ?? null,
        metacritic_url: common.metacritic?.url ?? null, is_early_access: common.releasestate === 'prerelease',
        positive_rating_percentage: common.review_percentage ? parseInt(common.review_percentage, 10) : null,
    };
}

function mergeApiData(picsData: Partial<GameDocument>, webData: WebApiData | null): Partial<GameDocument> {
    const mergedData = { ...picsData };
    if (!webData) return mergedData;
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
    mergedData.metacritic_score = webData.metacritic?.score ?? mergedData.metacritic_score;
    mergedData.metacritic_url = webData.metacritic?.url ?? mergedData.metacritic_url;
    if (reviews?.total_reviews > 0) {
        mergedData.positive_rating_percentage = Math.round((reviews.total_positive / reviews.total_reviews) * 100);
    }
    return mergedData;
}


// --- Main Backfill Logic ---

async function enrichAllGames() {
    console.log(`[Worker ${workerId}/${totalWorkers}] Starting one-time enrichment...`);
    let totalUpdatedCount = 0;
    let totalProcessedCount = 0;

    try {
        console.log(`[Worker ${workerId}/${totalWorkers}] Logging into Steam anonymously...`);
        steamUser.logOn({ anonymous: true });

        await new Promise<void>((resolve, reject) => {
            steamUser.on('loggedOn', () => { console.log(`[Worker ${workerId}/${totalWorkers}] Logged into Steam successfully.`); resolve(); });
            steamUser.on('error', (err) => { console.error(`[Worker ${workerId}/${totalWorkers}] Steam login error:`, err); reject(err); });
        });

        const BATCH_SIZE = 100;
        let page = 0;
        let hasMore = true;

        while (hasMore) {
            const offset = (workerId * BATCH_SIZE) + (page * totalWorkers * BATCH_SIZE);
            console.log(`\n[Worker ${workerId}/${totalWorkers}] Fetching batch of games from offset ${offset} (processed by this worker: ${totalProcessedCount})...`);

            const gameBatch = await databases.listDocuments(
                config.appwrite.databaseId!,
                config.appwrite.gamesCollectionId!,
                [
                    Query.limit(BATCH_SIZE),
                    Query.offset(offset)
                ]
            );

            if (gameBatch.documents.length === 0) {
                hasMore = false;
                continue;
            }

            for (const [index, game] of gameBatch.documents.entries()) {
                if (!game.steam_appid) {
                    console.warn(`[Worker ${workerId}] Game document ${game.$id} has no steam_appid, skipping.`);
                    continue;
                }

                console.log(`[Worker ${workerId}] (${totalProcessedCount + 1}) Processing game: ${game.name} (ID: ${game.steam_appid})`);
                
                const picsPromise = new Promise((resolve) => {
                     steamUser.getProductInfo([game.steam_appid], [], false, (err, apps) => resolve(apps?.[game.steam_appid] ?? null));
                });
                const webApiPromise = fetchGameDetailsFromWebAPI(game.steam_appid);

                const [picsData, webApiData] = await Promise.all([picsPromise, webApiPromise]);
                
                if (picsData) {
                    const formattedPicsData = formatPicsDataToGameDocument(game.steam_appid, picsData);
                    const finalGameData = mergeApiData(formattedPicsData, webApiData);

                    await databases.updateDocument(
                        config.appwrite.databaseId!,
                        config.appwrite.gamesCollectionId!,
                        game.$id,
                        finalGameData
                    );
                    totalUpdatedCount++;
                } else {
                    console.warn(`[Worker ${workerId}] Could not get PICS data for ${game.name}, skipping update.`);
                }

                totalProcessedCount++;

                if (index < gameBatch.documents.length - 1) {
                  await new Promise(resolve => setTimeout(resolve, DELAY_MS));
                }
            }
            page++;
        }

        console.log(`\n[Worker ${workerId}/${totalWorkers}] Enrichment complete! Processed: ${totalProcessedCount}, Updated: ${totalUpdatedCount}`);
        steamUser.logOff();

    } catch (e) {
        const error = e as Error;
        console.error(`\n[Worker ${workerId}/${totalWorkers}] Error during enrichment service:`, error.message);
        console.error(error.stack);
        steamUser.logOff();
        process.exit(1);
    }
}

enrichAllGames(); 