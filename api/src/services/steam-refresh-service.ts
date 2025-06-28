import { Client, Databases, Query, ID } from 'node-appwrite';
import SteamUser from 'steam-user';
import config from '../config';

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
const UPDATE_INTERVAL_DAYS = 7;
const GAMES_PER_MINUTE_LIMIT = 30; // Stay under the 100k/day Steam API limit
const DELAY_MS = 60000 / GAMES_PER_MINUTE_LIMIT;

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
            // Don't retry on client errors (4xx) or server errors that are not rate-limiting (e.g. 500)
            if (response.status >= 400 && response.status < 500) {
                 console.warn(`Request to ${url} failed with status ${response.status}. Not retrying.`);
                 return response; // Return the failed response to be handled by the caller
            }
             console.warn(`Request to ${url} failed with status ${response.status}. Retrying in ${backoff / 1000}s...`);
        } catch (error: any) {
            console.warn(`Request to ${url} failed with error: ${error.message}. Retrying in ${backoff / 1000}s...`);
        }
        await new Promise(resolve => setTimeout(resolve, backoff));
        backoff *= 2; // Exponential backoff
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

async function runRefreshService() {
  console.log("Local Steam refresh service started. It will run continuously until all games are updated.");
  let totalUpdatedCount = 0;

  try {
    console.log("Logging into Steam anonymously...");
    steamUser.logOn({ anonymous: true });

    await new Promise<void>((resolve, reject) => {
        steamUser.on('loggedOn', () => {
            console.log(`[Worker ${config.worker.id}/${config.worker.total}] Logged into Steam successfully.`);
            resolve();
        });
        steamUser.on('error', (err) => {
            console.error(`[Worker ${config.worker.id}/${config.worker.total}] Steam login error:`, err);
            reject(err);
        });
    });

    const BATCH_SIZE = 250; // Number of games each worker will process in its batch
    let currentOffset = config.worker.id * BATCH_SIZE;

    while (true) {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - UPDATE_INTERVAL_DAYS);

      console.log(`\n[Worker ${config.worker.id}/${config.worker.total}] Fetching batch of games starting from offset ${currentOffset}...`);

      // --- Fetch a batch of games that have never been updated ---
      const neverUpdatedResponse = await databases.listDocuments(
          config.appwrite.databaseId!,
          config.appwrite.gamesCollectionId!,
          [
              Query.isNull('last_updated'),
              Query.orderDesc('steam_appid'),
              Query.limit(BATCH_SIZE),
              Query.offset(currentOffset)
          ]
      );

      // --- Fetch a batch of games that were updated long ago ---
      const oldGamesFilter = [Query.lessThan('last_updated', thresholdDate.toISOString()), Query.equal('steam_app_type', 'game')];
      const oldGamesResponse = await databases.listDocuments(
          config.appwrite.databaseId!,
          config.appwrite.gamesCollectionId!,
          [
              ...oldGamesFilter,
              Query.orderDesc('steam_appid'),
              Query.limit(BATCH_SIZE),
              Query.offset(currentOffset)
          ]
      );

      // Combine, deduplicate, and get the top N newest games to process
      const allStaleGames = [...neverUpdatedResponse.documents, ...oldGamesResponse.documents];
      const staleGamesMap = new Map();
      allStaleGames.forEach(game => staleGamesMap.set(game.$id, game));
      
      const staleGames = Array.from(staleGamesMap.values())
          .sort((a, b) => (b.steam_appid || 0) - (a.steam_appid || 0))
          .slice(0, BATCH_SIZE);

      if (staleGames.length === 0) {
        console.log(`[Worker ${config.worker.id}/${config.worker.total}] No more stale games found at this offset. Worker will exit.`);
        break; // Exit the while loop
      }
      
      console.log(`[Worker ${config.worker.id}/${config.worker.total}] Found ${staleGames.length} games. Starting batch processing...`);

      for (const [index, game] of staleGames.entries()) {
        if (!game.steam_appid) {
          console.warn(`[Worker ${config.worker.id}/${config.worker.total}] Game document ${game.$id} has no steam_appid, skipping.`);
          continue;
        }

        console.log(`[Worker ${config.worker.id}/${config.worker.total}] Processing game: ${game.name} (Steam AppID: ${game.steam_appid})`);
        const steamResponse = await fetchGameDetailsFromSteam(game.steam_appid);

        if (steamResponse.type) {
          const success = await updateGameInAppwrite(game.$id, steamResponse.data, steamResponse.type);
          if (success) {
              totalUpdatedCount++;
              // Increment the stat immediately after a successful update
              await incrementStat('updatedGames');
          }
        }

        if (index < staleGames.length - 1) {
          console.log(`[Worker ${config.worker.id}/${config.worker.total}] Waiting for ${DELAY_MS / 1000} seconds before next Steam API call...`);
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
      }
      
      console.log(`[Worker ${config.worker.id}/${config.worker.total}] Batch finished. Total updated by this worker: ${totalUpdatedCount}.`);

      // Move to the next block of work
      currentOffset += config.worker.total * BATCH_SIZE;
    }

    console.log(`\n[Worker ${config.worker.id}/${config.worker.total}] Steam refresh completed.`);
    steamUser.logOff();

  } catch (e) {
    const error = e as Error;
    console.error(`[Worker ${config.worker.id}/${config.worker.total}] Error in Steam refresh service:`, error.message);
    steamUser.logOff();
    process.exit(1); // Exit with error for schedulers to pick up failure
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
        const documentsToDelete = [];
        let hasMore = true;
        let cursor;
        while (hasMore) {
            const queries: any[] = [Query.equal('steam_appid', steamAppId), Query.limit(100)];
            if (cursor) {
                queries.push(Query.cursorAfter(cursor));
            }
            const oldAchievements = await databases.listDocuments(config.appwrite.databaseId!, 'achievements', queries);
            if (oldAchievements.documents.length > 0) {
                documentsToDelete.push(...oldAchievements.documents);
                cursor = oldAchievements.documents[oldAchievements.documents.length - 1].$id;
            } else {
                hasMore = false;
            }
        }

        if (documentsToDelete.length > 0) {
            console.log(`Deleting ${documentsToDelete.length} old achievements for appid ${steamAppId}.`);
            const deletePromises = documentsToDelete.map(doc =>
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

// Autorun the service when the script is executed
if (require.main === module) {
    runRefreshService();
}

export { runRefreshService }; // Export if you plan to import it elsewhere
