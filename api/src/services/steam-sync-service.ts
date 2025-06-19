import { Client, Databases, Query, ID, AppwriteException } from 'node-appwrite';
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

async function fetchSteamGames(): Promise<Array<{ appid: number; name: string }>> {
    const url = "https://api.steampowered.com/ISteamApps/GetAppList/v2/";
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.applist.apps;
    } catch (error) {
        console.error("Failed to fetch Steam games list:", error);
        return []; // Return empty array on failure
    }
}

async function getExistingGameIds(): Promise<Set<number>> {
    const existingIds = new Set<number>();
    let hasMore = true;
    let lastId: string | undefined = undefined;

    while (hasMore) {
        const queries = [Query.limit(100)];
        if (lastId) {
            queries.push(Query.cursorAfter(lastId));
        }
        try {
            const response = await databases.listDocuments(
                config.appwrite.databaseId!,
                config.appwrite.gamesCollectionId!,
                queries
            );

            if (response.documents.length > 0) {
                response.documents.forEach(doc => {
                    if (doc.steam_appid) {
                        existingIds.add(doc.steam_appid);
                    }
                });
                lastId = response.documents[response.documents.length - 1].$id;
            } else {
                hasMore = false;
            }
        } catch (error) {
            console.error('Error fetching existing game IDs from Appwrite:', error);
            hasMore = false; // Stop on error
        }
    }
    return existingIds;
}

async function addNewGames(newGames: Array<{ appid: number; name: string }>) {
    const BATCH_SIZE = 100; // Appwrite recommends batches of 100
    for (let i = 0; i < newGames.length; i += BATCH_SIZE) {
        const batch = newGames.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${i / BATCH_SIZE + 1} of ${Math.ceil(newGames.length / BATCH_SIZE)}...`);

        const promises = batch.map(game => {
            return databases.createDocument(
                config.appwrite.databaseId!,
                config.appwrite.gamesCollectionId!,
                ID.unique(),
                {
                    steam_appid: game.appid,
                    name: game.name,
                }
            ).catch(error => {
                // Log specific errors but don't stop the whole batch
                if (error instanceof AppwriteException && error.code === 409) { // 409: Conflict (likely unique index)
                    console.warn(`Game with appid ${game.appid} might already exist (unique constraint failed). Skipping.`);
                } else {
                    console.error(`Error adding game ${game.name} (appid: ${game.appid}):`, error);
                }
            });
        });

        await Promise.all(promises);
        console.log(`Batch finished. Waiting 1 second...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
    }
}

async function runSyncService() {
    try {
        console.log("Starting Steam AppID sync service...");

        // 1. Fetch all games from Steam API
        console.log("Fetching all games from Steam...");
        const allSteamGames = await fetchSteamGames();
        if (allSteamGames.length === 0) {
            console.error("Steam games list is empty. Aborting sync.");
            return;
        }
        console.log(`Found ${allSteamGames.length} total games on Steam.`);

        // 2. Fetch all existing game IDs from Appwrite
        console.log("Fetching existing game IDs from database...");
        const existingGameIds = await getExistingGameIds();
        console.log(`Found ${existingGameIds.size} existing games in the database.`);

        // 3. Determine which games are new
        const newGames = allSteamGames.filter(game => !existingGameIds.has(game.appid));
        console.log(`Found ${newGames.length} new games to add.`);

        if (newGames.length > 0) {
            // 4. Add new games to Appwrite
            await addNewGames(newGames);
        }

        console.log("Steam sync completed successfully.");

    } catch (error) {
        console.error("A critical error occurred in the sync service:", error);
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