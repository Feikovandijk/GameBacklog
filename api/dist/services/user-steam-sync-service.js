"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncUserWithSteam = syncUserWithSteam;
const axios_1 = __importDefault(require("axios"));
const config_1 = __importDefault(require("../config"));
const client_1 = require("../supabase/client");
const STEAM_API_BASE = 'https://api.steampowered.com';
/**
 * Fetches the list of games owned by a user from the Steam API.
 */
function getOwnedGames(steamId, apiKey) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/`;
        try {
            const response = yield axios_1.default.get(url, {
                params: {
                    key: apiKey,
                    steamid: steamId,
                    include_appinfo: true,
                    include_played_free_games: true,
                    format: 'json'
                }
            });
            return response.data.response.games || [];
        }
        catch (error) {
            console.error(`Error fetching owned games for steamId ${steamId}:`, error);
            return [];
        }
    });
}
/**
 * Fetches a user's achievements for a specific game.
 */
function getPlayerAchievements(steamId, appId, apiKey) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `${STEAM_API_BASE}/ISteamUserStats/GetPlayerAchievements/v1/`;
        try {
            const response = yield axios_1.default.get(url, {
                params: {
                    key: apiKey,
                    steamid: steamId,
                    appid: appId,
                    l: 'english'
                }
            });
            return response.data.playerstats.achievements || [];
        }
        catch (_a) {
            // It's common for this to fail (e.g., game has no stats), so we log softly
            // console.log(`Could not fetch achievements for appid ${appId}:`, error.response?.data?.playerstats?.error);
            return [];
        }
    });
}
/**
 * Fetches a user's stats for a specific game (e.g., kills, deaths).
 */
function getUserStatsForGame(steamId, appId, apiKey) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `${STEAM_API_BASE}/ISteamUserStats/GetUserStatsForGame/v2/`;
        try {
            const response = yield axios_1.default.get(url, {
                params: {
                    key: apiKey,
                    steamid: steamId,
                    appid: appId
                }
            });
            return response.data.playerstats.stats || [];
        }
        catch (_a) {
            // console.log(`Could not fetch user stats for appid ${appId}:`, error.response?.data?.playerstats?.error);
            return [];
        }
    });
}
function getUserBacklog(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const backlog = new Map();
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;
        while (hasMore) {
            const { data, error } = yield client_1.supabase
                .from('user_games')
                .select('*')
                .eq('user_id', userId)
                .range(page * pageSize, (page + 1) * pageSize - 1);
            if (error) {
                console.error(`Error fetching user backlog page for user ${userId}:`, error);
                hasMore = false;
                break;
            }
            if (data.length > 0) {
                data.forEach(doc => backlog.set(doc.steam_appid, doc));
                page++;
                if (data.length < pageSize) {
                    hasMore = false;
                }
            }
            else {
                hasMore = false;
            }
        }
        return backlog;
    });
}
function syncGameStats(steamId, userId, gameId, appId, apiKey) {
    return __awaiter(this, void 0, void 0, function* () {
        const stats = yield getUserStatsForGame(steamId, appId, apiKey);
        if (stats.length > 0) {
            const statsJson = JSON.stringify(stats);
            yield client_1.supabase
                .from('user_games')
                .update({ stats_json: statsJson })
                .eq('id', gameId);
        }
    });
}
function syncGameAchievements(steamId, userId, appId, apiKey) {
    return __awaiter(this, void 0, void 0, function* () {
        const achievements = yield getPlayerAchievements(steamId, appId, apiKey);
        if (achievements.length === 0)
            return;
        const recordsToUpsert = achievements.map(ach => ({
            user_id: userId,
            steam_appid: appId,
            achievement_api_name: ach.apiname,
            is_unlocked: ach.achieved === 1,
            unlock_time: ach.achieved === 1 ? new Date(ach.unlocktime * 1000).toISOString() : null
        }));
        const { error } = yield client_1.supabase.from('user_achievements').upsert(recordsToUpsert, { onConflict: 'user_id,achievement_api_name' });
        if (error) {
            console.error(`Error syncing achievements for app ${appId}:`, error);
        }
    });
}
/**
 * The main service function to sync a user's Steam library with Supabase.
 */
function syncUserWithSteam(user) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`Starting Steam sync for user: ${user.display_name} (${user.steam_id})`);
        if (!config_1.default.steamApiKey) {
            console.error("Steam API key is not configured. Aborting sync.");
            return;
        }
        // 1. Fetch all owned games from Steam
        const ownedGames = yield getOwnedGames(user.steam_id, config_1.default.steamApiKey);
        console.log(`Found ${ownedGames.length} owned games for user ${user.steam_id}.`);
        if (ownedGames.length === 0)
            return;
        // 2. Get user's existing backlog from Supabase
        const userBacklog = yield getUserBacklog(user.$id);
        console.log(`User has ${userBacklog.size} games in their backlog.`);
        // 3. Process each game
        for (const game of ownedGames) {
            const existingGame = userBacklog.get(game.appid);
            const hoursPlayed = Math.round((game.playtime_forever / 60) * 100) / 100;
            const playtime2Weeks = game.playtime_2weeks || 0;
            if (existingGame) {
                // Game is already in backlog, update playtime
                const updatePayload = {
                    hours_played: hoursPlayed,
                    playtime_2weeks: playtime2Weeks,
                    updated_at: new Date().toISOString(),
                };
                if (playtime2Weeks > 0) {
                    updatePayload.last_played = new Date().toISOString();
                }
                if (existingGame.hours_played !== hoursPlayed || existingGame.playtime_2weeks !== playtime2Weeks) {
                    yield client_1.supabase.from('user_games').update(updatePayload).eq('id', existingGame.id);
                    console.log(`Updated playtime for ${game.name} to ${hoursPlayed} hours (${playtime2Weeks} mins in last 2 weeks).`);
                }
            }
            else {
                // Game is not in backlog, add it
                try {
                    // First, find the master game document to link to
                    const { data: masterGameResponse, error } = yield client_1.supabase.from('games').select('id').eq('steam_appid', game.appid).single();
                    if (masterGameResponse) {
                        const masterGameId = masterGameResponse.id;
                        yield client_1.supabase.from('user_games').insert({
                            user_id: user.$id,
                            game_id: masterGameId,
                            steam_appid: game.appid,
                            status: 'want_to_play', // Assuming a default status
                            hours_played: hoursPlayed,
                            playtime_2weeks: playtime2Weeks,
                            added_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            last_played: playtime2Weeks > 0 ? new Date().toISOString() : undefined
                        });
                        console.log(`Added new game to backlog: ${game.name}`);
                    }
                    if (error) {
                        console.error(`Error finding master game for ${game.name}:`, error);
                    }
                }
                catch (error) {
                    console.error(`Error adding new game ${game.name} to backlog:`, error);
                }
            }
            // 4. Sync Achievements & Stats for the game (can be done in parallel)
            const { data: gameDocument, error } = yield client_1.supabase.from('user_games').select('id').eq('user_id', user.$id).eq('steam_appid', game.appid).single();
            if (gameDocument) {
                yield Promise.all([
                    syncGameAchievements(user.steam_id, user.$id, game.appid, config_1.default.steamApiKey),
                    syncGameStats(user.steam_id, user.$id, gameDocument.id, game.appid, config_1.default.steamApiKey)
                ]);
            }
            if (error) {
                console.error(`Error finding game document for ${game.name}:`, error);
            }
        }
        // 5. Update the user's `last_steam_sync` timestamp
        yield client_1.supabase.from('users').update({ last_steam_sync: new Date().toISOString() }).eq('id', user.$id);
        console.log(`Sync for user ${user.display_name} completed.`);
    });
}
