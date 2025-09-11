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
exports.runRefreshService = runRefreshService;
const steam_user_1 = __importDefault(require("steam-user"));
const config_1 = __importDefault(require("../config"));
const client_1 = require("../supabase/client");
const steamUser = new steam_user_1.default();
steamUser.setOptions({
    enablePicsCache: true, // Required for getProductInfo
    changelistUpdateInterval: 0 // We don't need automatic updates
});
const STEAM_API_KEY = config_1.default.steamApiKeys[config_1.default.worker.id] || config_1.default.steamApiKey;
if (!STEAM_API_KEY) {
    throw new Error(`[Worker ${config_1.default.worker.id}] Steam API key is missing. Ensure STEAM_API_KEY_${config_1.default.worker.id} or a fallback STEAM_API_KEY is defined in your .env file.`);
}
const STEAM_API_BASE_URL = "https://store.steampowered.com/api/appdetails";
const REVIEW_API_BASE_URL = "https://store.steampowered.com/appreviews";
const UPDATE_INTERVAL_DAYS = 7;
const GAMES_PER_MINUTE_LIMIT = 30; // Stay under the 100k/day Steam API limit
const DELAY_MS = 60000 / GAMES_PER_MINUTE_LIMIT;
function fetchWithRetry(url_1) {
    return __awaiter(this, arguments, void 0, function* (url, retries = 3, backoff = 1000) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = yield fetch(url);
                if (response.ok) {
                    return response;
                }
                // Don't retry on client errors (4xx) or server errors that are not rate-limiting (e.g. 500)
                if (response.status >= 400 && response.status < 500) {
                    console.warn(`Request to ${url} failed with status ${response.status}. Not retrying.`);
                    return response; // Return the failed response to be handled by the caller
                }
                console.warn(`Request to ${url} failed with status ${response.status}. Retrying in ${backoff / 1000}s...`);
            }
            catch (error) {
                console.warn(`Request to ${url} failed with error: ${error.message}. Retrying in ${backoff / 1000}s...`);
            }
            yield new Promise(resolve => setTimeout(resolve, backoff));
            backoff *= 2; // Exponential backoff
        }
        throw new Error(`Failed to fetch from ${url} after ${retries} attempts.`);
    });
}
function fetchGameDetailsFromSteam(steamAppId) {
    return __awaiter(this, void 0, void 0, function* () {
        const appDetailsUrl = `${STEAM_API_BASE_URL}?appids=${steamAppId}&key=${STEAM_API_KEY}`;
        const reviewUrl = `${REVIEW_API_BASE_URL}/${steamAppId}?json=1&purchase_type=all`;
        const playersUrl = `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${steamAppId}`;
        try {
            const [appDetailsResponse, reviewResponse, playersResponse] = yield Promise.all([
                fetchWithRetry(appDetailsUrl),
                fetchWithRetry(reviewUrl),
                fetchWithRetry(playersUrl),
            ]);
            if (!appDetailsResponse.ok) {
                console.error(`Steam API request failed for appid ${steamAppId}: ${appDetailsResponse.status} ${appDetailsResponse.statusText}`);
                const errorBody = yield appDetailsResponse.text();
                console.error(`Steam API Error Body: ${errorBody}`);
                return null;
            }
            const appDetailsData = yield appDetailsResponse.json();
            const details = appDetailsData[steamAppId];
            if (!details || !details.success) {
                console.warn(`Steam indicated unsuccessful fetch for appid ${steamAppId}.`);
                return null;
            }
            const gameData = details.data;
            if (gameData.type && gameData.type !== 'game') {
                console.log(`AppID ${steamAppId} is a '${gameData.type}', not a game. Skipping full data processing.`);
                return null;
            }
            if (reviewResponse.ok) {
                const reviewJson = yield reviewResponse.json();
                if (reviewJson.success) {
                    gameData.review_summary = reviewJson.query_summary;
                }
            }
            if (playersResponse.ok) {
                const playersJson = yield playersResponse.json();
                if (playersJson.response && playersJson.response.result === 1) {
                    gameData.player_count = playersJson.response.player_count;
                }
            }
            return gameData;
        }
        catch (error) {
            console.error(`Error fetching game details for appid ${steamAppId} from Steam:`, error);
            return null;
        }
    });
}
function recordReviewHistory(gameId, totalReviews) {
    return __awaiter(this, void 0, void 0, function* () {
        if (typeof totalReviews !== 'number')
            return; // Don't record if no review data
        const historyData = {
            game_id: gameId,
            date: new Date().toISOString(),
            total_reviews: totalReviews,
        };
        try {
            const { error } = yield client_1.supabase
                .from('review_history')
                .insert(historyData);
            if (error) {
                console.error(`Error recording review history for game ${gameId}:`, error);
            }
            else {
                console.log(`Successfully recorded review history for game ${gameId}.`);
            }
        }
        catch (error) {
            console.error(`Error recording review history for game ${gameId}:`, error);
        }
    });
}
function updateGameInSupabase(gameId, steamData) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8;
        if (steamData) {
            // This is a valid game, do a full update
            const isEarlyAccess = (_b = (_a = steamData.genres) === null || _a === void 0 ? void 0 : _a.some((genre) => genre.description === "Early Access")) !== null && _b !== void 0 ? _b : false;
            let releaseDateForDb;
            const steamReleaseDate = steamData.release_date;
            if (steamReleaseDate && !steamReleaseDate.coming_soon && steamReleaseDate.date) {
                const parsedDate = new Date(steamReleaseDate.date);
                if (!isNaN(parsedDate.getTime())) {
                    releaseDateForDb = parsedDate.toISOString();
                }
                else {
                    console.warn(`Could not parse '${steamReleaseDate.date}' as a date for game '${steamData.name}'. Release date will be left unchanged.`);
                }
            }
            else if (steamReleaseDate === null || steamReleaseDate === void 0 ? void 0 : steamReleaseDate.coming_soon) {
                console.log(`'${steamData.name}' is marked as 'coming soon', release date will not be set.`);
            }
            const price = steamData.price_overview;
            const reviews = steamData.review_summary;
            const categories = (_d = (_c = steamData.categories) === null || _c === void 0 ? void 0 : _c.map(c => c.description)) !== null && _d !== void 0 ? _d : [];
            const hasSteamAchievements = categories.includes("Steam Achievements");
            const genres = steamData.genres ? steamData.genres.map(g => g.description) : null;
            const gameData = {
                name: steamData.name,
                short_description: steamData.short_description,
                detailed_description: (_e = steamData.detailed_description) !== null && _e !== void 0 ? _e : null,
                about_the_game: (_f = steamData.about_the_game) !== null && _f !== void 0 ? _f : null,
                header_image: steamData.header_image,
                website: (_g = steamData.website) !== null && _g !== void 0 ? _g : null,
                screenshots: steamData.screenshots ? steamData.screenshots.map(s => s.path_full) : null,
                movies: steamData.movies ? steamData.movies.map(m => m.mp4.max) : null,
                release_date: releaseDateForDb !== null && releaseDateForDb !== void 0 ? releaseDateForDb : null,
                last_updated: new Date().toISOString(),
                developers: steamData.developers,
                publishers: steamData.publishers,
                is_early_access: isEarlyAccess,
                is_free: (_h = steamData.is_free) !== null && _h !== void 0 ? _h : false,
                total_reviews: (_j = reviews === null || reviews === void 0 ? void 0 : reviews.total_reviews) !== null && _j !== void 0 ? _j : null,
                steam_app_type: 'game',
                price_final: (_k = price === null || price === void 0 ? void 0 : price.final) !== null && _k !== void 0 ? _k : null,
                price_currency: (_l = price === null || price === void 0 ? void 0 : price.currency) !== null && _l !== void 0 ? _l : null,
                price_initial: (_m = price === null || price === void 0 ? void 0 : price.initial) !== null && _m !== void 0 ? _m : null,
                discount_percent: (_o = price === null || price === void 0 ? void 0 : price.discount_percent) !== null && _o !== void 0 ? _o : null,
                total_positive: (_p = reviews === null || reviews === void 0 ? void 0 : reviews.total_positive) !== null && _p !== void 0 ? _p : null,
                total_negative: (_q = reviews === null || reviews === void 0 ? void 0 : reviews.total_negative) !== null && _q !== void 0 ? _q : null,
                positive_rating_percentage: (reviews === null || reviews === void 0 ? void 0 : reviews.total_reviews) && (reviews === null || reviews === void 0 ? void 0 : reviews.total_reviews) > 0 ? Math.round((reviews.total_positive / reviews.total_reviews) * 100) : null,
                review_score_desc: (_r = reviews === null || reviews === void 0 ? void 0 : reviews.review_score_desc) !== null && _r !== void 0 ? _r : null,
                current_players: (_s = steamData.player_count) !== null && _s !== void 0 ? _s : null,
                genres: genres,
                metacritic_score: (_u = (_t = steamData.metacritic) === null || _t === void 0 ? void 0 : _t.score) !== null && _u !== void 0 ? _u : null,
                metacritic_url: (_w = (_v = steamData.metacritic) === null || _v === void 0 ? void 0 : _v.url) !== null && _w !== void 0 ? _w : null,
                platforms_windows: (_y = (_x = steamData.platforms) === null || _x === void 0 ? void 0 : _x.windows) !== null && _y !== void 0 ? _y : null,
                platforms_mac: (_0 = (_z = steamData.platforms) === null || _z === void 0 ? void 0 : _z.mac) !== null && _0 !== void 0 ? _0 : null,
                platforms_linux: (_2 = (_1 = steamData.platforms) === null || _1 === void 0 ? void 0 : _1.linux) !== null && _2 !== void 0 ? _2 : null,
                pc_requirements: (_3 = steamData.pc_requirements) !== null && _3 !== void 0 ? _3 : null,
                mac_requirements: (_4 = steamData.mac_requirements) !== null && _4 !== void 0 ? _4 : null,
                linux_requirements: (_5 = steamData.linux_requirements) !== null && _5 !== void 0 ? _5 : null,
                supported_languages: (_6 = steamData.supported_languages) !== null && _6 !== void 0 ? _6 : null,
                dlc: (_7 = steamData.dlc) !== null && _7 !== void 0 ? _7 : null,
                required_age: (_8 = steamData.required_age) !== null && _8 !== void 0 ? _8 : null,
                categories: categories.length > 0 ? categories : null,
                has_steam_achievements: hasSteamAchievements,
            };
            try {
                const { error } = yield client_1.supabase
                    .from('games')
                    .update(gameData)
                    .eq('id', gameId);
                if (error) {
                    console.error(`Error updating game ${steamData.name} in Supabase:`, error);
                    return false;
                }
                console.log(`Successfully updated game ${steamData.name}`);
                if (hasSteamAchievements) {
                    console.log(`Game ${steamData.name} has achievements. Syncing...`);
                    yield syncGameAchievements(gameId, steamData.steam_appid);
                }
                if (reviews === null || reviews === void 0 ? void 0 : reviews.total_reviews) {
                    yield recordReviewHistory(gameId, reviews.total_reviews);
                }
                return true;
            }
            catch (error) {
                console.error(`Error updating game ${steamData.name} in Supabase:`, error);
                return false;
            }
        }
        else {
            const gameData = {
                last_updated: new Date().toISOString(),
                steam_app_type: 'invalid',
            };
            try {
                const { error } = yield client_1.supabase
                    .from('games')
                    .update(gameData)
                    .eq('id', gameId);
                if (error) {
                    console.error(`Error marking game ${gameId} as 'invalid':`, error);
                    return false;
                }
                console.log(`Marked game ${gameId} as type 'invalid'. It will be skipped in future updates.`);
                return false;
            }
            catch (error) {
                console.error(`Error marking game ${gameId} as 'invalid':`, error);
                return false;
            }
        }
    });
}
function runRefreshService() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Local Steam refresh service started. It will run continuously until all games are updated.");
        let totalUpdatedCount = 0;
        try {
            const { count, error: countError } = yield client_1.supabase.from('games').select('*', { count: 'exact', head: true });
            if (countError) {
                console.error("Error counting games in database:", countError);
                throw new Error("Could not count games in database.");
            }
            if (count === 0) {
                console.log("\nThe 'games' table is empty. This script is for refreshing existing game data.");
                console.log("--> Please run the 'steam-sync-service.ts' script first to populate your database with all games from Steam.");
                return; // Exit gracefully
            }
            console.log("Logging into Steam anonymously...");
            steamUser.logOn({ anonymous: true });
            yield new Promise((resolve, reject) => {
                steamUser.on('loggedOn', () => {
                    console.log(`[Worker ${config_1.default.worker.id}/${config_1.default.worker.total}] Logged into Steam successfully.`);
                    resolve();
                });
                steamUser.on('error', (err) => {
                    console.error(`[Worker ${config_1.default.worker.id}/${config_1.default.worker.total}] Steam login error:`, err);
                    reject(err);
                });
            });
            const BATCH_SIZE = 250;
            let currentOffset = config_1.default.worker.id * BATCH_SIZE;
            while (true) {
                const thresholdDate = new Date();
                thresholdDate.setDate(thresholdDate.getDate() - UPDATE_INTERVAL_DAYS);
                console.log(`
[Worker ${config_1.default.worker.id}/${config_1.default.worker.total}] Fetching batch of games starting from offset ${currentOffset}...`);
                const { data: neverUpdatedData, error: neverUpdatedError } = yield client_1.supabase
                    .from('games')
                    .select('*')
                    .is('last_updated', null)
                    .order('steam_appid', { ascending: false })
                    .range(currentOffset, currentOffset + BATCH_SIZE - 1);
                if (neverUpdatedError) {
                    console.error('Error fetching never updated games:', neverUpdatedError);
                }
                const { data: oldGamesData, error: oldGamesError } = yield client_1.supabase
                    .from('games')
                    .select('*')
                    .lt('last_updated', thresholdDate.toISOString())
                    .eq('steam_app_type', 'game')
                    .order('steam_appid', { ascending: false })
                    .range(currentOffset, currentOffset + BATCH_SIZE - 1);
                if (oldGamesError) {
                    console.error('Error fetching old games:', oldGamesError);
                }
                const allStaleGames = [...(neverUpdatedData || []), ...(oldGamesData || [])];
                const staleGamesMap = new Map();
                allStaleGames.forEach(game => staleGamesMap.set(game.id, game));
                const staleGames = Array.from(staleGamesMap.values())
                    .sort((a, b) => (b.steam_appid || 0) - (a.steam_appid || 0))
                    .slice(0, BATCH_SIZE);
                if (staleGames.length === 0) {
                    console.log(`[Worker ${config_1.default.worker.id}/${config_1.default.worker.total}] No more stale games found at this offset. Worker will exit.`);
                    break;
                }
                console.log(`[Worker ${config_1.default.worker.id}/${config_1.default.worker.total}] Found ${staleGames.length} games. Starting batch processing...`);
                for (const [index, game] of staleGames.entries()) {
                    if (!game.steam_appid) {
                        console.warn(`[Worker ${config_1.default.worker.id}/${config_1.default.worker.total}] Game ${game.id} has no steam_appid, skipping.`);
                        continue;
                    }
                    console.log(`[Worker ${config_1.default.worker.id}/${config_1.default.worker.total}] Processing game: ${game.name} (Steam AppID: ${game.steam_appid})`);
                    const steamData = yield fetchGameDetailsFromSteam(game.steam_appid);
                    const success = yield updateGameInSupabase(game.id, steamData);
                    if (success) {
                        totalUpdatedCount++;
                        yield incrementStat('updatedGames');
                    }
                    if (index < staleGames.length - 1) {
                        console.log(`[Worker ${config_1.default.worker.id}/${config_1.default.worker.total}] Waiting for ${DELAY_MS / 1000} seconds before next Steam API call...`);
                        yield new Promise(resolve => setTimeout(resolve, DELAY_MS));
                    }
                }
                console.log(`[Worker ${config_1.default.worker.id}/${config_1.default.worker.total}] Batch finished. Total updated by this worker: ${totalUpdatedCount}.`);
                currentOffset += config_1.default.worker.total * BATCH_SIZE;
            }
            console.log(`
[Worker ${config_1.default.worker.id}/${config_1.default.worker.total}] Steam refresh completed.`);
            steamUser.logOff();
        }
        catch (e) {
            const error = e;
            console.error(`[Worker ${config_1.default.worker.id}/${config_1.default.worker.total}] Error in Steam refresh service:`, error.message);
            steamUser.logOff();
            process.exit(1);
        }
    });
}
function incrementStat(key_1) {
    return __awaiter(this, arguments, void 0, function* (key, incrementBy = 1) {
        try {
            const { data: existing, error: fetchError } = yield client_1.supabase
                .from('statistics')
                .select('*')
                .eq('key', key)
                .single();
            if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
                console.error(`Error fetching stat for key ${key}:`, fetchError);
                return;
            }
            if (existing) {
                const newCount = (existing.count || 0) + incrementBy;
                const { error: updateError } = yield client_1.supabase
                    .from('statistics')
                    .update({ count: newCount })
                    .eq('key', key);
                if (updateError) {
                    console.error(`Error updating stat for key ${key}:`, updateError);
                }
            }
        }
        catch (e) {
            console.error(`\nFailed to increment stat for key: ${key}. Error: ${e}`);
        }
    });
}
function syncGameAchievements(documentId, steamAppId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        const schemaUrl = `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${STEAM_API_KEY}&appid=${steamAppId}&l=english`;
        const percentagesUrl = `https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid=${steamAppId}`;
        try {
            const [schemaResponse, percentagesResponse] = yield Promise.all([
                fetchWithRetry(schemaUrl),
                fetchWithRetry(percentagesUrl)
            ]);
            if (!schemaResponse.ok) {
                console.warn(`Could not fetch achievement schema for appid ${steamAppId}. Status: ${schemaResponse.status}`);
                return;
            }
            const schemaData = yield schemaResponse.json();
            const achievements = (_c = (_b = (_a = schemaData.game) === null || _a === void 0 ? void 0 : _a.availableGameStats) === null || _b === void 0 ? void 0 : _b.achievements) !== null && _c !== void 0 ? _c : [];
            if (achievements.length === 0) {
                console.log(`No achievements found for appid ${steamAppId}.`);
                return;
            }
            const percentagesData = {};
            if (percentagesResponse.ok) {
                const percentagesJson = yield percentagesResponse.json();
                if ((_d = percentagesJson === null || percentagesJson === void 0 ? void 0 : percentagesJson.achievementpercentages) === null || _d === void 0 ? void 0 : _d.achievements) {
                    percentagesJson.achievementpercentages.achievements.forEach((ach) => {
                        const percentValue = parseFloat(ach.percent);
                        if (!isNaN(percentValue)) {
                            percentagesData[ach.name] = percentValue;
                        }
                        else {
                            console.warn(`Could not parse achievement percent for ${ach.name} as a float. Value was: ${ach.percent}`);
                        }
                    });
                }
            }
            else {
                console.warn(`Could not fetch achievement percentages for appid ${steamAppId}.`);
            }
            const achievementsToCreate = achievements.map(ach => {
                var _a;
                return ({
                    game_id: documentId,
                    steam_appid: steamAppId,
                    api_name: ach.name,
                    display_name: ach.displayName,
                    description: ach.description || null,
                    icon: ach.icon || null,
                    icon_gray: ach.icongray || null,
                    hidden: !!ach.hidden,
                    global_percentage: (_a = percentagesData[ach.name]) !== null && _a !== void 0 ? _a : null,
                });
            });
            // Delete all old achievements for the game to ensure data is fresh
            const { error: deleteError } = yield client_1.supabase
                .from('achievements')
                .delete()
                .eq('steam_appid', steamAppId);
            if (deleteError) {
                console.error(`Error deleting old achievements for appid ${steamAppId}:`, deleteError);
            }
            else {
                console.log(`Deleted old achievements for appid ${steamAppId}.`);
            }
            // Create new ones in batches
            const BATCH_SIZE = 50;
            for (let i = 0; i < achievementsToCreate.length; i += BATCH_SIZE) {
                const batch = achievementsToCreate.slice(i, i + BATCH_SIZE);
                const { error: insertError } = yield client_1.supabase
                    .from('achievements')
                    .insert(batch);
                if (insertError) {
                    console.error(`Error inserting achievement batch for appid ${steamAppId}:`, insertError);
                }
            }
            console.log(`Successfully synced ${achievementsToCreate.length} achievements for appid ${steamAppId}.`);
        }
        catch (error) {
            console.error(`Error syncing achievements for appid ${steamAppId}:`, error);
        }
    });
}
// Autorun the service when the script is executed
if (require.main === module) {
    runRefreshService();
}
