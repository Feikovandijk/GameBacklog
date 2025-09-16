import config from '../config';
import { driver as neo4jDriver } from '../neo4j/client';

const STEAM_API_KEY = config.steamApiKeys[config.worker.id] || config.steamApiKey;

if (!STEAM_API_KEY) {
    throw new Error(`[Worker ${config.worker.id}] Steam API key is missing. Ensure STEAM_API_KEY_${config.worker.id} or a fallback STEAM_API_KEY is defined in your .env file.`);
}

const GAMES_PER_MINUTE_LIMIT = 60;
const DELAY_MS = 60000 / GAMES_PER_MINUTE_LIMIT;
const UPDATE_INTERVAL_HOURS = 24;

async function fetchWithRetry(url: string, retries: number = 3, backoff: number = 1000): Promise<Response> {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                return response;
            }
            if (response.status >= 400 && response.status < 500) {
                 console.warn(`Request to ${url} failed with status ${response.status}. Not retrying.`);
                 return response;
            }
             console.warn(`Request to ${url} failed with status ${response.status}. Retrying in ${backoff / 1000}s...`);
        } catch (error: any) {
            console.warn(`Request to ${url} failed with error: ${error.message}. Retrying in ${backoff / 1000}s...`);
        }
        await new Promise(resolve => setTimeout(resolve, backoff));
        backoff *= 2;
    }
    throw new Error(`Failed to fetch from ${url} after ${retries} attempts.`);
}

async function getPlayerCount(steamAppId: number): Promise<number | null> {
    const playersUrl = `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${steamAppId}`;
    try {
        const playersResponse = await fetchWithRetry(playersUrl);
        if (playersResponse.ok) {
            const playersJson = await playersResponse.json();
            if (playersJson.response?.result === 1) {
                return playersJson.response.player_count;
            }
        }
        return null;
    } catch (error) {
        console.error(`Error fetching player count for appid ${steamAppId}:`, error);
        return null;
    }
}

async function runPlayerCountSync() {
    console.log("Steam player count sync service started.");
    let totalUpdatedCount = 0;

    const session = neo4jDriver.session();
    let games: any[] = [];
    try {
        const thresholdDate = new Date();
        thresholdDate.setHours(thresholdDate.getHours() - UPDATE_INTERVAL_HOURS);

        const result = await session.run(`
            MATCH (g:Game)
            WHERE (g.player_count_last_updated IS NULL OR g.player_count_last_updated < datetime({epochSeconds: ${Math.floor(thresholdDate.getTime() / 1000)}})) AND (g.player_count_zero_sync_streak IS NULL OR g.player_count_zero_sync_streak < 2) AND g.steam_app_type = 'game'
            RETURN g
        `);
        games = result.records.map(record => record.get('g').properties);
    } finally {
        await session.close();
    }

    if (games.length === 0) {
        console.log("No more games to update player count for.");
        return;
    }

    console.log(`Found ${games.length} games to update player count.`);

    for (const game of games) {
        if (!game.steam_appid) continue;

        const playerCount = await getPlayerCount(game.steam_appid.low);

        if (playerCount !== null) {
            const currentStreak = game.player_count_zero_sync_streak?.low || 0;
            const newStreak = playerCount === 0 ? currentStreak + 1 : 0;

            const updateSession = neo4jDriver.session();
            try {
                await updateSession.run(`
                    MATCH (g:Game {steam_appid: $steam_appid})
                    SET g.current_players = $playerCount, g.player_count_last_updated = timestamp(), g.player_count_zero_sync_streak = $newStreak
                `, { steam_appid: game.steam_appid.low, playerCount, newStreak });
                console.log(`Updated player count for ${game.name} to ${playerCount}`);
                totalUpdatedCount++;
            } catch (error) {
                console.error(`Error updating player count for game ${game.name}:`, error);
            } finally {
                await updateSession.close();
            }
        }

        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }

    console.log(`Player count sync finished. Updated ${totalUpdatedCount} games.`);
}

async function runService() {
    let exitCode = 0;
    try {
        await runPlayerCountSync();
    } catch (e) {
        const error = e as Error;
        console.error(`Error in Steam player count sync service:`, error.message);
        console.error(error.stack);
        exitCode = 1;
    } finally {
        process.exit(exitCode);
    }
}

void runService();