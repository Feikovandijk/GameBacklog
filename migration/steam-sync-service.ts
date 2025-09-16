import { driver as neo4jDriver } from '../neo4j/client';

// Fetches the full list of all Steam games
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

// Fetches all game IDs currently in the Neo4j database
async function getExistingGameIds(): Promise<Set<number>> {
    const session = neo4jDriver.session();
    const existingIds = new Set<number>();
    try {
        const result = await session.run('MATCH (g:Game) RETURN g.steam_appid AS steam_appid');
        result.records.forEach((record: any) => {
            existingIds.add(record.get('steam_appid').low);
        });
    } finally {
        await session.close();
    }
    return existingIds;
}

// Adds new games to the Neo4j database in batches
async function addNewGames(newGames: Array<{ appid: number; name: string }>) {
    const BATCH_SIZE = 1000;
    const session = neo4jDriver.session();
    try {
        for (let i = 0; i < newGames.length; i += BATCH_SIZE) {
            const batch = newGames.slice(i, i + BATCH_SIZE);
            
            const query = `
                UNWIND $batch AS game
                MERGE (g:Game {steam_appid: game.appid})
                ON CREATE SET g.name = game.name
            `;

            await session.run(query, { batch });
            console.log(`--- Batch of ${batch.length} processed. ---`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
        }
    } finally {
        await session.close();
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

        // 2. Fetch all existing game IDs from Neo4j
        console.log("Fetching existing game IDs from database...");
        const existingGameIds = await getExistingGameIds();
        console.log(`Found ${existingGameIds.size} existing games in the database.`);

        // 3. Determine which games are new
        const newGames = allSteamGames.filter(game => !existingGameIds.has(game.appid));
        console.log(`Found ${newGames.length} new games to add.`);

        if (newGames.length > 0) {
            // 4. Add new games to Neo4j
            await addNewGames(newGames);
        }

        console.log("Steam sync completed successfully.");

    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred';
        console.error("A critical error occurred in the sync service:", message);
        process.exit(1);
    }
}

// Autorun the service when the script is executed
if (require.main === module) {
    runSyncService();
}
