import { Client, Databases, Query, ID, AppwriteException } from 'node-appwrite';
import axios from 'axios';
import config from '../config';
import { User } from '../auth/steam-auth';

const appwriteClient = new Client()
    .setEndpoint(config.appwrite.endpoint!)
    .setProject(config.appwrite.projectId!)
    .setKey(config.appwrite.apiKey!);
const databases = new Databases(appwriteClient);

const STEAM_API_BASE = 'https://api.steampowered.com';

interface OwnedGame {
    appid: number;
    name: string;
    playtime_forever: number;
    playtime_2weeks?: number;
    img_icon_url: string;
    img_logo_url: string;
}

interface PlayerAchievement {
    apiname: string;
    achieved: number; // 1 for unlocked, 0 for locked
    unlocktime: number; // Unix timestamp
}

interface GameStats {
    name: string;
    value: number;
}

/**
 * Fetches the list of games owned by a user from the Steam API.
 */
async function getOwnedGames(steamId: string, apiKey: string): Promise<OwnedGame[]> {
    const url = `${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/`;
    try {
        const response = await axios.get(url, {
            params: {
                key: apiKey,
                steamid: steamId,
                include_appinfo: true,
                include_played_free_games: true,
                format: 'json'
            }
        });
        return response.data.response.games || [];
    } catch (error) {
        console.error(`Error fetching owned games for steamId ${steamId}:`, error);
        return [];
    }
}

/**
 * Fetches a user's achievements for a specific game.
 */
async function getPlayerAchievements(steamId: string, appId: number, apiKey: string): Promise<PlayerAchievement[]> {
    const url = `${STEAM_API_BASE}/ISteamUserStats/GetPlayerAchievements/v1/`;
    try {
        const response = await axios.get(url, {
            params: {
                key: apiKey,
                steamid: steamId,
                appid: appId,
                l: 'english'
            }
        });
        return response.data.playerstats.achievements || [];
    } catch (error) {
        // It's common for this to fail (e.g., game has no stats), so we log softly
        // console.log(`Could not fetch achievements for appid ${appId}:`, error.response?.data?.playerstats?.error);
        return [];
    }
}

/**
 * Fetches a user's stats for a specific game (e.g., kills, deaths).
 */
async function getUserStatsForGame(steamId: string, appId: number, apiKey: string): Promise<GameStats[]> {
     const url = `${STEAM_API_BASE}/ISteamUserStats/GetUserStatsForGame/v2/`;
    try {
        const response = await axios.get(url, {
            params: {
                key: apiKey,
                steamid: steamId,
                appid: appId
            }
        });
        return response.data.playerstats.stats || [];
    } catch (error) {
         // console.log(`Could not fetch user stats for appid ${appId}:`, error.response?.data?.playerstats?.error);
        return [];
    }
}

async function getUserBacklog(userId: string): Promise<Map<number, any>> {
    const backlog = new Map<number, any>();
    let hasMore = true;
    let offset = 0;
    const pageSize = 100;

    while (hasMore) {
        try {
            const response = await databases.listDocuments(
                config.appwrite.databaseId!,
                'user_games',
                [
                    Query.equal('user_id', userId),
                    Query.limit(pageSize),
                    Query.offset(offset)
                ]
            );

            if (response.documents.length > 0) {
                response.documents.forEach(doc => backlog.set(doc.steam_appid, doc));
                offset += pageSize;
            } else {
                hasMore = false;
            }
        } catch (error) {
            console.error(`Error fetching user backlog page for user ${userId}:`, error);
            hasMore = false;
        }
    }
    return backlog;
}

async function syncGameStats(steamId: string, userId: string, gameId: string, appId: number, apiKey: string) {
    const stats = await getUserStatsForGame(steamId, appId, apiKey);
    if (stats.length > 0) {
        const statsJson = JSON.stringify(stats);
        await databases.updateDocument(config.appwrite.databaseId!, 'user_games', gameId, {
            stats_json: statsJson
        });
    }
}

async function syncGameAchievements(steamId: string, userId: string, appId: number, apiKey: string) {
    const achievements = await getPlayerAchievements(steamId, appId, apiKey);
    if (achievements.length === 0) return;

    const userAchievementsCollection = 'user_achievements';

    for (const ach of achievements) {
        try {
            // Check if we have this achievement record already
            const existing = await databases.listDocuments(config.appwrite.databaseId!, userAchievementsCollection, [
                Query.equal('user_id', userId),
                Query.equal('achievement_api_name', ach.apiname)
            ]);

            const record = {
                user_id: userId,
                steam_appid: appId,
                achievement_api_name: ach.apiname,
                is_unlocked: ach.achieved === 1,
                unlock_time: ach.achieved === 1 ? new Date(ach.unlocktime * 1000).toISOString() : null
            };

            if (existing.documents.length > 0) {
                // Update if changed
                const doc = existing.documents[0];
                if (doc.is_unlocked !== record.is_unlocked) {
                    await databases.updateDocument(config.appwrite.databaseId!, userAchievementsCollection, doc.$id, record);
                }
            } else {
                // Create new
                await databases.createDocument(config.appwrite.databaseId!, userAchievementsCollection, ID.unique(), record);
            }
        } catch (error) {
            console.error(`Error syncing achievement ${ach.apiname} for app ${appId}:`, error);
        }
    }
}

/**
 * The main service function to sync a user's Steam library with Appwrite.
 */
export async function syncUserWithSteam(user: User) {
    console.log(`Starting Steam sync for user: ${user.display_name} (${user.steam_id})`);
    
    if (!config.steamApiKey) {
        console.error("Steam API key is not configured. Aborting sync.");
        return;
    }

    // 1. Fetch all owned games from Steam
    const ownedGames = await getOwnedGames(user.steam_id, config.steamApiKey);
    console.log(`Found ${ownedGames.length} owned games for user ${user.steam_id}.`);
    if (ownedGames.length === 0) return;

    // 2. Get user's existing backlog from Appwrite
    const userBacklog = await getUserBacklog(user.$id);
    console.log(`User has ${userBacklog.size} games in their backlog.`);

    // 3. Process each game
    for (const game of ownedGames) {
        const existingGame = userBacklog.get(game.appid);
        const hoursPlayed = Math.round((game.playtime_forever / 60) * 100) / 100;
        const playtime2Weeks = game.playtime_2weeks || 0;

        if (existingGame) {
            // Game is already in backlog, update playtime
            const updatePayload: { hours_played: number; playtime_2weeks: number; updated_at: string; last_played?: string } = {
                hours_played: hoursPlayed,
                playtime_2weeks: playtime2Weeks,
                updated_at: new Date().toISOString(),
            };

            if (playtime2Weeks > 0) {
                updatePayload.last_played = new Date().toISOString();
            }

            if (existingGame.hours_played !== hoursPlayed || existingGame.playtime_2weeks !== playtime2Weeks) {
                await databases.updateDocument(config.appwrite.databaseId!, 'user_games', existingGame.$id, updatePayload);
                console.log(`Updated playtime for ${game.name} to ${hoursPlayed} hours (${playtime2Weeks} mins in last 2 weeks).`);
            }
        } else {
            // Game is not in backlog, add it
            try {
                // First, find the master game document to link to
                const masterGameResponse = await databases.listDocuments(config.appwrite.databaseId!, config.appwrite.gamesCollectionId!, [Query.equal('steam_appid', game.appid)]);
                if (masterGameResponse.documents.length > 0) {
                    const masterGameId = masterGameResponse.documents[0].$id;
                    await databases.createDocument(config.appwrite.databaseId!, 'user_games', ID.unique(), {
                        user_id: user.$id,
                        game_id: masterGameId,
                        steam_appid: game.appid,
                        status: user.default_game_status || 'want_to_play',
                        hours_played: hoursPlayed,
                        playtime_2weeks: playtime2Weeks,
                        added_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        last_played: playtime2Weeks > 0 ? new Date().toISOString() : undefined
                    });
                     console.log(`Added new game to backlog: ${game.name}`);
                }
            } catch (error) {
                console.error(`Error adding new game ${game.name} to backlog:`, error);
            }
        }
        
        // 4. Sync Achievements & Stats for the game (can be done in parallel)
        const gameDocumentId = existingGame ? existingGame.$id : (await databases.listDocuments(config.appwrite.databaseId!, 'user_games', [Query.equal('user_id', user.$id), Query.equal('steam_appid', game.appid)])).documents[0]?.$id;
        if(gameDocumentId) {
            await Promise.all([
                syncGameAchievements(user.steam_id, user.$id, game.appid, config.steamApiKey),
                syncGameStats(user.steam_id, user.$id, gameDocumentId, game.appid, config.steamApiKey)
            ]);
        }
    }
    
    // 5. Update the user's `last_steam_sync` timestamp
    await databases.updateDocument(config.appwrite.databaseId!, 'users', user.$id, {
        last_steam_sync: new Date().toISOString()
    });

    console.log(`Sync for user ${user.display_name} completed.`);
} 