import { Client, Databases, Query } from 'node-appwrite';
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

const STEAM_API_KEY = config.steamApiKey!;

const STEAM_API_BASE_URL = "https://store.steampowered.com/api/appdetails";
const REVIEW_API_BASE_URL = "https://store.steampowered.com/appreviews";
const UPDATE_INTERVAL_DAYS = 7;
const GAMES_PER_MINUTE_LIMIT = 30; // Stay under the 100k/day Steam API limit
const DELAY_MS = 60000 / GAMES_PER_MINUTE_LIMIT; // Calculate delay in milliseconds

interface GameDocument {
  steam_appid: number;
  name: string;
  short_description?: string;
  header_image?: string;
  release_date?: string; 
  last_updated: string;
  developers?: string[];
  publishers?: string[];
  is_early_access?: boolean;
  total_reviews?: number;
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

async function fetchGameDetailsFromSteam(steamAppId: number): Promise<any | null> {
  const appDetailsUrl = `${STEAM_API_BASE_URL}?appids=${steamAppId}&key=${STEAM_API_KEY}`;
  const reviewUrl = `${REVIEW_API_BASE_URL}/${steamAppId}?json=1&purchase_type=all`;

  console.log(`Fetching app details from: ${appDetailsUrl.replace(STEAM_API_KEY, 'YOUR_STEAM_KEY')}`);
  console.log(`Fetching reviews from: ${reviewUrl}`);

  try {
    const [appDetailsResponse, reviewResponse] = await Promise.all([
      fetchWithRetry(appDetailsUrl),
      fetchWithRetry(reviewUrl)
    ]);

    if (!appDetailsResponse.ok) {
      console.error(
        `Steam API request failed for appid ${steamAppId}: ${appDetailsResponse.status} ${appDetailsResponse.statusText}`
      );
      const errorBody = await appDetailsResponse.text();
      console.error(`Steam API Error Body: ${errorBody}`);
      return null;
    }
    
    const appDetailsData = await appDetailsResponse.json();
    let reviewData = null;

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

    if (appDetailsData && appDetailsData[steamAppId] && appDetailsData[steamAppId].success) {
      const gameData = appDetailsData[steamAppId].data;
      if (reviewData) {
        gameData.recommendations = { total: reviewData.total_reviews };
      }
      return gameData;
    }

    console.warn(
      `No data or unsuccessful response for appid ${steamAppId} from Steam. Response: ${JSON.stringify(
        appDetailsData
      )}`
    );
    return null;
  } catch (error) {
    console.error(
      `Error fetching game details for appid ${steamAppId} from Steam:`, error
    );
    return null;
  }
}

async function updateGameInAppwrite(documentId: string, steamData: any) {
    const isEarlyAccess = steamData.genres?.some(
        (genre: { id: string; description: string }) => genre.description === "Early Access"
    ) ?? false;

    let releaseDateForDb: string | undefined;
    const steamReleaseDate = steamData.release_date;

    // Only process the date if the game is not marked as "coming soon"
    if (steamReleaseDate && !steamReleaseDate.coming_soon && steamReleaseDate.date) {
        const parsedDate = new Date(steamReleaseDate.date);
        // Check if the parsed date is valid
        if (!isNaN(parsedDate.getTime())) {
            releaseDateForDb = parsedDate.toISOString();
        } else {
            // The date string is not a recognizable format
            console.warn(`Could not parse '${steamReleaseDate.date}' as a date for game '${steamData.name}'. Release date will be left unchanged.`);
        }
    } else if (steamReleaseDate?.coming_soon) {
        console.log(`'${steamData.name}' is marked as 'coming soon', release date will not be set.`);
    }

    const gameData: Partial<GameDocument> = {
        name: steamData.name,
        short_description: steamData.short_description,
        header_image: steamData.header_image,
        release_date: releaseDateForDb,
        last_updated: new Date().toISOString(),
        developers: steamData.developers,
        publishers: steamData.publishers,
        is_early_access: isEarlyAccess,
        total_reviews: steamData.recommendations?.total,
    };

    try {
        await databases.updateDocument(
            config.appwrite.databaseId!,
            config.appwrite.gamesCollectionId!,
            documentId,
            gameData
        );
        console.log(`Successfully updated game ${steamData.name}`);
        return true;
    } catch (error) {
        console.error(`Error updating game ${steamData.name} in Appwrite:`, error);
        return false;
    }
}

async function runRefreshService() {
  console.log("Local Steam refresh service started.");

  try {
    const PROCESSING_LIMIT = 500; // Process up to 500 games per run
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - UPDATE_INTERVAL_DAYS);

    console.log("Fetching a batch of stale games from Appwrite...");
    
    // Fetch newest games that have never been updated
    const neverUpdatedResponse = await databases.listDocuments(
        config.appwrite.databaseId!,
        config.appwrite.gamesCollectionId!,
        [
            Query.isNull('last_updated'),
            Query.orderDesc('steam_appid'),
            Query.limit(PROCESSING_LIMIT)
        ]
    );

    // Fetch newest games that were updated long ago
    const oldGamesResponse = await databases.listDocuments(
        config.appwrite.databaseId!,
        config.appwrite.gamesCollectionId!,
        [
            Query.lessThan('last_updated', thresholdDate.toISOString()),
            Query.orderDesc('steam_appid'),
            Query.limit(PROCESSING_LIMIT)
        ]
    );

    // Combine, deduplicate, and get the top N newest games to process
    const allStaleGames = [...neverUpdatedResponse.documents, ...oldGamesResponse.documents];
    const staleGamesMap = new Map();
    allStaleGames.forEach(game => staleGamesMap.set(game.$id, game));
    
    const staleGames = Array.from(staleGamesMap.values())
        .sort((a, b) => (b.steam_appid || 0) - (a.steam_appid || 0))
        .slice(0, PROCESSING_LIMIT);

    if (!staleGames || staleGames.length === 0) {
      console.log("No stale games to update.");
      return;
    }

    console.log(`Found ${staleGames.length} stale games to update. Starting with highest Steam AppID.`);

    let updatedCount = 0;
    for (const [index, game] of staleGames.entries()) {
      if (!game.steam_appid) {
        console.warn(
          `Game document ${game.$id} has no steam_appid, skipping.`
        );
        continue;
      }

      console.log(
        `Processing game: ${game.name} (Document ID: ${game.$id}, Steam AppID: ${game.steam_appid})`
      );
      const steamData = await fetchGameDetailsFromSteam(game.steam_appid);

      if (steamData) {
        const success = await updateGameInAppwrite(game.$id, steamData);
        if(success) {
            updatedCount++;
            // Increment the stat immediately after a successful update
            await incrementStat('updatedGames');
        }
      }

      if (index < staleGames.length - 1) {
        console.log(
          `Waiting for ${DELAY_MS / 1000} seconds before next Steam API call...`
        );
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    console.log(
      `Steam refresh completed. Updated ${updatedCount} of ${staleGames.length} games.`
    );

  } catch (e: any) {
    console.error("Error in Steam refresh service:", e);
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

// Autorun the service when the script is executed
if (require.main === module) {
    runRefreshService();
}

export { runRefreshService }; // Export if you plan to import it elsewhere
