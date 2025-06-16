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

async function fetchGameDetailsFromSteam(steamAppId: number): Promise<any | null> {
  const appDetailsUrl = `${STEAM_API_BASE_URL}?appids=${steamAppId}&key=${STEAM_API_KEY}`;
  const reviewUrl = `${REVIEW_API_BASE_URL}/${steamAppId}?json=1&purchase_type=all`;

  console.log(`Fetching app details from: ${appDetailsUrl.replace(STEAM_API_KEY, 'YOUR_STEAM_KEY')}`);
  console.log(`Fetching reviews from: ${reviewUrl}`);

  try {
    const [appDetailsResponse, reviewResponse] = await Promise.all([
      fetch(appDetailsUrl),
      fetch(reviewUrl)
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

    const gameData: Partial<GameDocument> = {
        name: steamData.name,
        short_description: steamData.short_description,
        header_image: steamData.header_image,
        release_date: steamData.release_date?.date,
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

async function fetchAllStaleDocuments(queries: string[]): Promise<any[]> {
    const documents = [];
    let offset = 0;
    const limit = 100; // Appwrite's max limit per request
    let response;

    do {
        response = await databases.listDocuments(
            config.appwrite.databaseId!,
            config.appwrite.gamesCollectionId!,
            [...queries, Query.limit(limit), Query.offset(offset)]
        );
        documents.push(...response.documents);
        offset += limit;
    } while (response.documents.length > 0);

    return documents;
}

async function runRefreshService() {
  console.log("Local Steam refresh service started.");

  try {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - UPDATE_INTERVAL_DAYS);

    console.log("Fetching stale games from Appwrite...");
    
    const neverUpdatedGames = await fetchAllStaleDocuments([Query.isNull('last_updated')]);
    const oldGames = await fetchAllStaleDocuments([Query.lessThan('last_updated', thresholdDate.toISOString())]);

    // Combine and deduplicate the results
    const allStaleGames = [...neverUpdatedGames, ...oldGames];
    const staleGamesMap = new Map();
    allStaleGames.forEach(game => staleGamesMap.set(game.$id, game));
    const staleGames = Array.from(staleGamesMap.values());

    if (!staleGames || staleGames.length === 0) {
      console.log("No stale games to update.");
      return;
    }

    console.log(`Found ${staleGames.length} stale games to update.`);

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
    
    if (updatedCount > 0) {
        console.log(`Incrementing updatedGames stat by ${updatedCount}...`);
        await incrementStat('updatedGames', updatedCount);
    }

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
