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
const steam_user_1 = __importDefault(require("steam-user"));
const config_1 = __importDefault(require("../config"));
const client_1 = require("../supabase/client");
const steamUser = new steam_user_1.default();
steamUser.setOptions({
    changelistUpdateInterval: 0,
});
const STEAM_API_KEY = config_1.default.steamApiKeys[config_1.default.worker.id] || config_1.default.steamApiKey;
if (!STEAM_API_KEY) {
    throw new Error(`[Worker ${config_1.default.worker.id}] Steam API key is missing. Ensure STEAM_API_KEY_${config_1.default.worker.id} or a fallback STEAM_API_KEY is defined in your .env file.`);
}
const GAMES_PER_MINUTE_LIMIT = 60; // This is a single API call per game, so we can go faster.
const DELAY_MS = 60000 / GAMES_PER_MINUTE_LIMIT;
const UPDATE_INTERVAL_HOURS = 24; // For development
function fetchWithRetry(url_1) {
    return __awaiter(this, arguments, void 0, function* (url, retries = 3, backoff = 1000) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = yield fetch(url);
                if (response.ok) {
                    return response;
                }
                if (response.status >= 400 && response.status < 500) {
                    console.warn(`Request to ${url} failed with status ${response.status}. Not retrying.`);
                    return response;
                }
                console.warn(`Request to ${url} failed with status ${response.status}. Retrying in ${backoff / 1000}s...`);
            }
            catch (error) {
                console.warn(`Request to ${url} failed with error: ${error.message}. Retrying in ${backoff / 1000}s...`);
            }
            yield new Promise(resolve => setTimeout(resolve, backoff));
            backoff *= 2;
        }
        throw new Error(`Failed to fetch from ${url} after ${retries} attempts.`);
    });
}
function getPlayerCount(steamAppId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const playersUrl = `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${steamAppId}`;
        try {
            const playersResponse = yield fetchWithRetry(playersUrl);
            if (playersResponse.ok) {
                const playersJson = yield playersResponse.json();
                if (((_a = playersJson.response) === null || _a === void 0 ? void 0 : _a.result) === 1) {
                    return playersJson.response.player_count;
                }
            }
            return null;
        }
        catch (error) {
            console.error(`Error fetching player count for appid ${steamAppId}:`, error);
            return null;
        }
    });
}
function recordPlayerCountHistory(gameId, playerCount) {
    return __awaiter(this, void 0, void 0, function* () {
        if (typeof playerCount !== 'number') {
            return;
        }
        const historyData = {
            game_id: gameId,
            date: new Date().toISOString(),
            player_count: playerCount,
        };
        try {
            const { error } = yield client_1.supabase
                .from('player_count_history')
                .insert(historyData);
            if (error) {
                console.error(`Error recording player count history for game ${gameId}:`, error);
            }
        }
        catch (error) {
            console.error(`Error recording player count history for game ${gameId}:`, error);
        }
    });
}
function runPlayerCountSync() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Steam player count sync service started.');
        let totalUpdatedCount = 0;
        const BATCH_SIZE = 100;
        let offset = 0;
        while (true) {
            const thresholdDate = new Date();
            thresholdDate.setHours(thresholdDate.getHours() - UPDATE_INTERVAL_HOURS);
            const { data: games, error } = yield client_1.supabase
                .from('games')
                .select('id, steam_appid, name, player_count_last_updated, player_count_zero_sync_streak')
                .or(`player_count_last_updated.is.null,player_count_last_updated.lt.${thresholdDate.toISOString()}`)
                .lt('player_count_zero_sync_streak', 2)
                .eq('steam_app_type', 'game')
                .order('steam_appid', { ascending: true })
                .range(offset, offset + BATCH_SIZE - 1);
            if (error) {
                console.error('Error fetching games:', error);
                break;
            }
            if (games.length === 0) {
                console.log('No more games to update player count for.');
                break;
            }
            console.log(`Found ${games.length} games to update player count.`);
            for (const game of games) {
                if (!game.steam_appid) {
                    continue;
                }
                const playerCount = yield getPlayerCount(Number(game.steam_appid));
                if (playerCount !== null) {
                    const currentStreak = game.player_count_zero_sync_streak || 0;
                    const newStreak = playerCount === 0 ? currentStreak + 1 : 0;
                    const { error: updateError } = yield client_1.supabase
                        .from('games')
                        .update({
                        current_players: playerCount,
                        player_count_last_updated: new Date().toISOString(),
                        player_count_zero_sync_streak: newStreak,
                    })
                        .eq('id', game.id);
                    if (updateError) {
                        console.error(`Error updating player count for game ${game.name}:`, updateError);
                    }
                    else {
                        console.log(`Updated player count for ${game.name} to ${playerCount}`);
                        totalUpdatedCount++;
                        yield recordPlayerCountHistory(String(game.id), playerCount);
                    }
                }
                yield new Promise(resolve => setTimeout(resolve, DELAY_MS));
            }
            offset += BATCH_SIZE;
        }
        console.log(`Player count sync finished. Updated ${totalUpdatedCount} games.`);
    });
}
function runService() {
    return __awaiter(this, void 0, void 0, function* () {
        let exitCode = 0;
        try {
            yield runPlayerCountSync();
        }
        catch (e) {
            const error = e;
            console.error(`Error in Steam player count sync service:`, error.message);
            console.error(error.stack);
            exitCode = 1;
        }
        finally {
            process.exit(exitCode);
        }
    });
}
void runService();
