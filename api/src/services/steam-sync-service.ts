import { Client, Databases, ID, Query } from 'node-appwrite';
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

const STEAM_API_GET_APP_LIST_URL = "https://api.steampowered.com/ISteamApps/GetAppList/v2/";
const GAMES_PER_MINUTE_LIMIT = 3000;
const DELAY_MS = 60000 / GAMES_PER_MINUTE_LIMIT;

interface SteamApp {
  appid: number;
  name: string;
}

async function fetchAllSteamApps(): Promise<SteamApp[]> {
  try {
    console.log("Fetching all Steam apps...");
    const response = await fetch(STEAM_API_GET_APP_LIST_URL);
    if (!response.ok) {
      console.error(`Steam API request failed: ${response.status} ${response.statusText}`);
      return [];
    }
    const data = await response.json();
    if (data.applist && data.applist.apps) {
      console.log(`Successfully fetched ${data.applist.apps.length} apps from Steam.`);
      return data.applist.apps;
    }
    return [];
  } catch (error) {
    console.error("Error fetching all Steam apps:", error);
    return [];
  }
}

async function getExistingSteamAppIds(): Promise<number[]> {
    try {
        let allGames: any[] = [];
        let offset = 0;
        const limit = 100; // Appwrite max limit per request
        let response;

        do {
            response = await databases.listDocuments(
                config.appwrite.databaseId!,
                config.appwrite.gamesCollectionId!,
                [
                    Query.limit(limit),
                    Query.offset(offset)
                ]
            );
            allGames = allGames.concat(response.documents);
            offset += limit;
        } while (response.documents.length > 0);
        
        return allGames.map(game => game.steam_appid).filter(id => id != null);
    } catch (error) {
        console.error("Error fetching existing steam_appids from Appwrite:", error);
        return [];
    }
}


async function runSyncService() {
  console.log("Local Steam sync service started.");
  try {
    const allSteamApps = await fetchAllSteamApps();
    if (!allSteamApps || allSteamApps.length === 0) {
      console.log("No apps fetched from Steam. Exiting.");
      return;
    }

    const existingAppIds = await getExistingSteamAppIds();
    console.log(`Found ${existingAppIds.length} existing games in the database.`);
    
    const newApps = allSteamApps.filter(app => !existingAppIds.includes(app.appid) && app.name.trim() !== '');

    if (newApps.length === 0) {
        console.log("No new games to add. Database is up-to-date.");
        return;
    }

    console.log(`Found ${newApps.length} new games to sync.`);

    let syncedCount = 0;
    for (const [index, app] of newApps.entries()) {
      console.log(`[${index + 1}/${newApps.length}] Syncing game: ${app.name} (Steam AppID: ${app.appid})`);

      try {
        await databases.createDocument(
            config.appwrite.databaseId!,
            config.appwrite.gamesCollectionId!,
            ID.unique(),
            {
                steam_appid: app.appid,
                name: app.name
            }
        );
        syncedCount++;
        console.log(`Successfully inserted ${app.name}`);
        await incrementStat(databases, 'totalGames');
      } catch (error: any) {
        // Appwrite throws an error for unique constraint violations (409 Conflict)
        if (error.code === 409) {
            console.warn(`Game with steam_appid ${app.appid} already exists. Skipping.`);
        } else {
            console.error(`Error inserting game ${app.name} (ID: ${app.appid}):`, error);
        }
      }
      
      if (index < newApps.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    console.log(`Steam sync completed. Synced ${syncedCount} new games.`);

  } catch (e: any) {
    console.error("Error in Steam sync service:", e);
    process.exit(1);
  }
}

async function incrementStat(databases: Databases, key: string, incrementBy: number = 1) {
    const dbId = config.appwrite.databaseId!;
    const statsCollectionId = 'statistics';
    try {
        const existing = await databases.listDocuments(dbId, statsCollectionId, [Query.equal('key', key)]);
        if (existing.documents.length > 0) {
            const doc = existing.documents[0];
            const newCount = doc.count + incrementBy;
            await databases.updateDocument(dbId, statsCollectionId, doc.$id, { count: newCount });
        }
        // If the stat doc doesn't exist, we don't create it here. 
        // The recalculate script is the source of truth for creating stats.
    } catch (e) {
        // Log error but don't crash the sync service
        console.error(`\nFailed to increment stat for key: ${key}. Error: ${e}`);
    }
}

if (require.main === module) {
    runSyncService();
} 