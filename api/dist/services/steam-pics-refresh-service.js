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
/**
 * Steam PICS Refresh Service
 *
 * This service is the primary tool for keeping the game database synchronized with Steam.
 * It uses Steam's "changenumber" system to get a list of all apps that have been
 * added or updated since the last time the service was run.
 *
 * It performs the following steps:
 * 1. Fetches the last known changenumber from the database.
 * 2. Asks Steam for all product changes since that number.
 * 3. For each changed app, it fetches the latest data from Steam.
 * 4. It checks if the app is already in our database.
 *    - If it exists, it updates the game's details.
 *    - If it's a new game (and not a DLC, demo, etc.), it creates a new entry.
 *
 * This script is designed to be run frequently (e.g., every hour) to catch new
 * releases and updates as they happen.
 */
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
const GAMES_PER_MINUTE_LIMIT = 13; // Each game update can be 3-5 API calls. With a 100k/day limit (~69/min), this is a safe throttle.
const DELAY_MS = 60000 / GAMES_PER_MINUTE_LIMIT;
const STATE_DOCUMENT_ID = 'steam_changenumber';
const STATE_COLLECTION_ID = 'steam_state';
function fetchWithRetry(url_1) {
    return __awaiter(this, arguments, void 0, function* (url, retries = 3, backoff = 1000) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = yield fetch(url);
                if (response.ok) {
                    return response;
                }
                if (response.status >= 400 && response.status < 500) {
                    console.warn(`Request to ${url.replace(STEAM_API_KEY, 'YOUR_STEAM_KEY')} failed with status ${response.status}. Not retrying.`);
                    const errorBody = yield response.text();
                    console.warn(`Steam API Error Body: ${errorBody}`);
                    return response;
                }
                console.warn(`Request to ${url.replace(STEAM_API_KEY, 'YOUR_STEAM_KEY')} failed with status ${response.status}. Retrying in ${backoff / 1000}s...`);
            }
            catch (error) {
                console.warn(`Request to ${url.replace(STEAM_API_KEY, 'YOUR_STEAM_KEY')} failed with error: ${error.message}. Retrying in ${backoff / 1000}s...`);
            }
            yield new Promise(resolve => setTimeout(resolve, backoff));
            backoff *= 2;
        }
        throw new Error(`Failed to fetch from ${url} after ${retries} attempts.`);
    });
}
function getLatestChangenumber() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { data, error } = yield client_1.supabase
                .from('steam_sync_state')
                .select('changenumber')
                .eq('id', STATE_DOCUMENT_ID)
                .single();
            if (error) {
                if (error.code === 'PGRST116') { // Not found
                    console.log('No previous changenumber found in database. Starting fresh from changenumber 0.');
                    return 0;
                }
                throw error;
            }
            return (data === null || data === void 0 ? void 0 : data.changenumber) || 0;
        }
        catch (error) {
            console.error('Error fetching latest changenumber, defaulting to 0:', error);
            return 0;
        }
    });
}
function saveLatestChangenumber(changenumber) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { error: updateError } = yield client_1.supabase
                .from('steam_sync_state')
                .update({ changenumber })
                .eq('id', STATE_DOCUMENT_ID);
            if (updateError) {
                if (updateError.code === 'PGRST116') { // No rows returned
                    console.log('Changenumber document not found, creating a new one.');
                    const { error: insertError } = yield client_1.supabase
                        .from('steam_sync_state')
                        .insert({ id: STATE_DOCUMENT_ID, changenumber });
                    if (insertError) {
                        throw insertError;
                    }
                    console.log(`Successfully created and saved new changenumber: ${changenumber}`);
                }
                else {
                    throw updateError;
                }
            }
            else {
                console.log(`Successfully saved new changenumber: ${changenumber}`);
            }
        }
        catch (error) {
            console.error(`Error saving new changenumber ${changenumber}:`, error);
        }
    });
}
function formatPicsDataToGameDocument(appId, picsData) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    const common = (_b = (_a = picsData.appinfo) === null || _a === void 0 ? void 0 : _a.common) !== null && _b !== void 0 ? _b : {};
    const developers = [], publishers = [];
    if (common.associations) {
        Object.values(common.associations).forEach((assoc) => {
            if (assoc.type === 'developer')
                developers.push(assoc.name);
            else if (assoc.type === 'publisher')
                publishers.push(assoc.name);
        });
    }
    const oslist = ((_c = common.oslist) === null || _c === void 0 ? void 0 : _c.split(',')) || [];
    let releaseDateForDb = null;
    const steamReleaseTimestamp = common.steam_release_date;
    if (steamReleaseTimestamp) {
        // The timestamp is in seconds, so we multiply by 1000 for milliseconds
        const parsedDate = new Date(parseInt(steamReleaseTimestamp, 10) * 1000);
        if (!isNaN(parsedDate.getTime())) {
            releaseDateForDb = parsedDate.toISOString();
        }
    }
    // PICS provides tag IDs. The actual names aren't in this response.
    const tags = common.store_tags ? Object.values(common.store_tags) : [];
    // PICS provides category IDs in the format "category_X". We'll store them as is.
    const categories = common.category ? Object.keys(common.category) : [];
    const hasSteamAchievements = categories.includes("category_22"); // Category 22 is "Steam Achievements"
    let headerImageUrl = null;
    if ((_d = common.header_image) === null || _d === void 0 ? void 0 : _d.english) {
        headerImageUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/${common.header_image.english}`;
    }
    return {
        steam_appid: appId,
        name: common.name,
        last_updated: new Date().toISOString(),
        steam_app_type: (_f = (_e = common.type) === null || _e === void 0 ? void 0 : _e.toLowerCase()) !== null && _f !== void 0 ? _f : 'unknown',
        // From PICS 'common'
        developers: developers.length > 0 ? developers : null,
        publishers: publishers.length > 0 ? publishers : null,
        release_date: releaseDateForDb,
        header_image: headerImageUrl,
        platforms_windows: oslist.includes('windows'),
        platforms_mac: oslist.includes('macos'),
        platforms_linux: oslist.includes('linux'),
        tags: tags.length > 0 ? tags : null,
        categories: categories.length > 0 ? categories : null,
        has_steam_achievements: hasSteamAchievements,
        controller_support: (_g = common.controller_support) !== null && _g !== void 0 ? _g : null,
        metacritic_score: (_j = (_h = common.metacritic) === null || _h === void 0 ? void 0 : _h.score) !== null && _j !== void 0 ? _j : null,
        metacritic_url: (_l = (_k = common.metacritic) === null || _k === void 0 ? void 0 : _k.url) !== null && _l !== void 0 ? _l : null,
        is_early_access: common.releasestate === 'prerelease',
        // Fields not available in getProductInfo that were in the old method
        short_description: null,
        total_reviews: null,
        price_final: null,
        price_currency: null,
        price_initial: null,
        discount_percent: null,
        total_positive: null,
        total_negative: null,
        review_score_desc: null,
        current_players: null,
        // Fields available in PICS but not the old method
        positive_rating_percentage: common.review_percentage ? parseInt(common.review_percentage, 10) : null,
    };
}
function fetchGameDetailsFromWebAPI(steamAppId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
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
                console.error(`Web API request failed for appid ${steamAppId}: ${appDetailsResponse.status} ${appDetailsResponse.statusText}`);
                return null;
            }
            const appDetailsJson = yield appDetailsResponse.json();
            const appDetails = appDetailsJson[steamAppId];
            if (!(appDetails === null || appDetails === void 0 ? void 0 : appDetails.success)) {
                console.warn(`Web API indicated unsuccessful fetch for appid ${steamAppId}.`);
                return null;
            }
            const gameData = appDetails.data;
            if (reviewResponse.ok) {
                const reviewJson = yield reviewResponse.json();
                if (reviewJson.success) {
                    gameData.review_summary = reviewJson.query_summary;
                }
            }
            if (playersResponse.ok) {
                const playersJson = yield playersResponse.json();
                if (((_a = playersJson.response) === null || _a === void 0 ? void 0 : _a.result) === 1) {
                    gameData.player_count = playersJson.response.player_count;
                }
            }
            return gameData;
        }
        catch (error) {
            console.error(`Error fetching game details for appid ${steamAppId} from Web API:`, error);
            return null;
        }
    });
}
function mergeApiData(picsData, webData) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z;
    const mergedData = Object.assign({}, picsData);
    if (!webData) {
        return mergedData;
    }
    const reviews = webData.review_summary;
    const price = webData.price_overview;
    mergedData.short_description = (_a = webData.short_description) !== null && _a !== void 0 ? _a : mergedData.short_description;
    mergedData.total_reviews = (_b = reviews === null || reviews === void 0 ? void 0 : reviews.total_reviews) !== null && _b !== void 0 ? _b : null;
    mergedData.price_final = (_c = price === null || price === void 0 ? void 0 : price.final) !== null && _c !== void 0 ? _c : null;
    mergedData.price_currency = (_d = price === null || price === void 0 ? void 0 : price.currency) !== null && _d !== void 0 ? _d : null;
    mergedData.price_initial = (_e = price === null || price === void 0 ? void 0 : price.initial) !== null && _e !== void 0 ? _e : null;
    mergedData.discount_percent = (_f = price === null || price === void 0 ? void 0 : price.discount_percent) !== null && _f !== void 0 ? _f : null;
    mergedData.total_positive = (_g = reviews === null || reviews === void 0 ? void 0 : reviews.total_positive) !== null && _g !== void 0 ? _g : null;
    mergedData.total_negative = (_h = reviews === null || reviews === void 0 ? void 0 : reviews.total_negative) !== null && _h !== void 0 ? _h : null;
    mergedData.review_score_desc = (_j = reviews === null || reviews === void 0 ? void 0 : reviews.review_score_desc) !== null && _j !== void 0 ? _j : null;
    mergedData.current_players = (_k = webData.player_count) !== null && _k !== void 0 ? _k : null;
    // Web API sometimes has better metacritic data
    mergedData.metacritic_score = (_m = (_l = webData.metacritic) === null || _l === void 0 ? void 0 : _l.score) !== null && _m !== void 0 ? _m : mergedData.metacritic_score;
    mergedData.metacritic_url = (_p = (_o = webData.metacritic) === null || _o === void 0 ? void 0 : _o.url) !== null && _p !== void 0 ? _p : mergedData.metacritic_url;
    mergedData.genres = webData.genres ? webData.genres.map(g => g.description) : null;
    // Add all new fields
    mergedData.detailed_description = (_q = webData.detailed_description) !== null && _q !== void 0 ? _q : null;
    mergedData.about_the_game = (_r = webData.about_the_game) !== null && _r !== void 0 ? _r : null;
    mergedData.website = (_s = webData.website) !== null && _s !== void 0 ? _s : null;
    mergedData.screenshots = webData.screenshots ? webData.screenshots.map(s => s.path_full) : null;
    mergedData.movies = webData.movies ? webData.movies.map(m => m.mp4.max) : null;
    mergedData.is_free = (_t = webData.is_free) !== null && _t !== void 0 ? _t : false;
    mergedData.pc_requirements = (_u = webData.pc_requirements) !== null && _u !== void 0 ? _u : null;
    mergedData.mac_requirements = (_v = webData.mac_requirements) !== null && _v !== void 0 ? _v : null;
    mergedData.linux_requirements = (_w = webData.linux_requirements) !== null && _w !== void 0 ? _w : null;
    mergedData.supported_languages = (_x = webData.supported_languages) !== null && _x !== void 0 ? _x : null;
    mergedData.dlc = (_y = webData.dlc) !== null && _y !== void 0 ? _y : null;
    mergedData.required_age = (_z = webData.required_age) !== null && _z !== void 0 ? _z : null;
    // The positive rating percentage can be calculated more accurately from web data
    if ((reviews === null || reviews === void 0 ? void 0 : reviews.total_reviews) && reviews.total_reviews > 0) {
        mergedData.positive_rating_percentage = Math.round((reviews.total_positive / reviews.total_reviews) * 100);
    }
    return mergedData;
}
function performRefresh() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Steam PICS refresh service started.");
        let totalUpdatedCount = 0;
        let totalCreatedCount = 0;
        console.log("Logging into Steam anonymously...");
        steamUser.logOn({ anonymous: true });
        yield new Promise((resolve, reject) => {
            steamUser.on('loggedOn', () => {
                console.log(`Logged into Steam successfully.`);
                resolve();
            });
            steamUser.on('error', (err) => {
                console.error(`Steam login error:`, err);
                reject(err);
            });
        });
        const { count, error: countError } = yield client_1.supabase.from('games').select('*', { count: 'exact', head: true });
        if (countError) {
            console.error("Error counting games in database:", countError);
            throw new Error("Could not count games in database.");
        }
        if (count === 0) {
            console.log("\nThe 'games' table is empty. This script is for finding new and updated games.");
            console.log("--> Please run the 'steam-sync-service.ts' script first to populate your database with all games from Steam.\n");
            return; // Exit gracefully
        }
        const lastChangenumber = yield getLatestChangenumber();
        console.log(`Last known changenumber is ${lastChangenumber}. Fetching changes...`);
        const productChanges = yield new Promise((resolve, reject) => {
            steamUser.getProductChanges(lastChangenumber, (err, currentChangenumber, appChanges, packageChanges) => {
                console.log("DEBUG: getProductChanges callback fired.");
                if (err) {
                    console.error("DEBUG: Error from getProductChanges:", err);
                    return reject(err);
                }
                console.log("DEBUG: currentChangenumber from Steam:", currentChangenumber);
                console.log("DEBUG: appChanges received from Steam:", appChanges.length);
                console.log("DEBUG: packageChanges received from Steam:", packageChanges.length);
                resolve({ currentChangenumber, appChanges, packageChanges });
            });
        });
        const { currentChangenumber, appChanges } = productChanges;
        // If the changenumber from Steam hasn't advanced, there's nothing to do.
        if (currentChangenumber <= lastChangenumber) {
            console.log(`Steam changenumber (${currentChangenumber}) has not advanced past local changenumber (${lastChangenumber}). No changes to fetch.`);
            return;
        }
        // If there are no app changes, but the number has advanced (e.g., package updates),
        // save the new changenumber to avoid getting stuck and exit.
        if (appChanges.length === 0) {
            console.log(`No new app changes from Steam, but changenumber has updated from ${lastChangenumber} to ${currentChangenumber}.`);
            yield saveLatestChangenumber(currentChangenumber);
            console.log("Database changenumber updated. Exiting.");
            return;
        }
        console.log(`Received ${appChanges.length} app changes. Current changenumber is ${currentChangenumber}.`);
        const allAppIdsToProcess = appChanges.map((app) => app.appid);
        if (allAppIdsToProcess.length > 0) {
            // Use a smaller chunk size for database queries to ensure reliability.
            // The getProductInfo call can still handle a larger batch.
            const DB_CHUNK_SIZE = 25;
            const gameDocsByAppId = new Map();
            console.log("Checking which of the changed apps are already in the database...");
            for (let i = 0; i < allAppIdsToProcess.length; i += DB_CHUNK_SIZE) {
                const chunk = allAppIdsToProcess.slice(i, i + DB_CHUNK_SIZE);
                try {
                    const { data: games, error } = yield client_1.supabase
                        .from('games')
                        .select('*')
                        .in('steam_appid', chunk)
                        .limit(DB_CHUNK_SIZE);
                    if (error) {
                        console.error(`Error querying database for chunk starting at index ${i}:`, error);
                    }
                    else {
                        games === null || games === void 0 ? void 0 : games.forEach((doc) => gameDocsByAppId.set(doc.steam_appid, doc));
                    }
                }
                catch (e) {
                    console.error(`Error querying database for chunk starting at index ${i}:`, e);
                }
            }
            console.log(`Found ${gameDocsByAppId.size} existing games out of ${allAppIdsToProcess.length} changed apps. Fetching latest data for all changes...`);
            const apps = yield new Promise((resolve, reject) => {
                steamUser.getProductInfo(allAppIdsToProcess, [], false, (err, apps) => {
                    if (err) {
                        return reject(new Error('Failed to get product info from Steam: ' + err.message));
                    }
                    resolve(apps);
                });
            });
            const appIdsWithData = Object.keys(apps).map(id => parseInt(id, 10));
            let processedCount = 0;
            for (const appId of appIdsWithData) {
                processedCount++;
                const picsData = apps[appId];
                const existingDoc = gameDocsByAppId.get(appId);
                if (picsData.appinfo) {
                    const formattedPicsData = formatPicsDataToGameDocument(appId, picsData);
                    // Skip non-game entries early to avoid unnecessary API calls
                    if (formattedPicsData.steam_app_type !== 'game') {
                        console.log(`(${processedCount}/${appIdsWithData.length}) Skipping appid ${appId} as it is a '${formattedPicsData.steam_app_type}', not a game.`);
                        continue;
                    }
                    const webApiData = yield fetchGameDetailsFromWebAPI(appId);
                    const finalGameData = mergeApiData(formattedPicsData, webApiData);
                    try {
                        if (existingDoc) {
                            // --- UPDATE EXISTING GAME ---
                            const { error: updateError } = yield client_1.supabase
                                .from('games')
                                .update(finalGameData)
                                .eq('id', existingDoc.id);
                            if (updateError) {
                                throw updateError;
                            }
                            console.log(`(${processedCount}/${appIdsWithData.length}) Successfully updated game: ${finalGameData.name} (${finalGameData.steam_appid})`);
                            totalUpdatedCount++;
                            yield incrementStat('updatedGames');
                            if (finalGameData.has_steam_achievements) {
                                console.log(`Game ${finalGameData.name} has achievements. Syncing...`);
                                yield syncGameAchievements(existingDoc.id, appId);
                            }
                        }
                        else {
                            // --- CREATE NEW GAME ---
                            const { data: newDoc, error: createError } = yield client_1.supabase
                                .from('games')
                                .insert(finalGameData)
                                .select()
                                .single();
                            if (createError) {
                                throw createError;
                            }
                            console.log(`(${processedCount}/${appIdsWithData.length}) Successfully created new game: ${finalGameData.name} (${finalGameData.steam_appid})`);
                            totalCreatedCount++;
                            yield incrementStat('createdGames');
                            if (finalGameData.has_steam_achievements) {
                                console.log(`Game ${finalGameData.name} has achievements. Syncing...`);
                                yield syncGameAchievements(newDoc.id, appId);
                            }
                        }
                    }
                    catch (e) {
                        console.error(`Error processing game ${finalGameData.name} in database:`, e);
                    }
                }
                else {
                    if (existingDoc) {
                        const updatePayload = {
                            last_updated: new Date().toISOString(),
                            steam_app_type: 'invalid',
                        };
                        const { error: updateError } = yield client_1.supabase
                            .from('games')
                            .update(updatePayload)
                            .eq('id', existingDoc.id);
                        if (updateError) {
                            console.error(`Error updating invalid game ${appId}:`, updateError);
                        }
                        else {
                            console.log(`(${processedCount}/${appIdsWithData.length}) Marked existing appid ${appId} as invalid as no PICS info was returned.`);
                        }
                    }
                    else {
                        console.log(`(${processedCount}/${appIdsWithData.length}) Ignored new appid ${appId} as it has no PICS info.`);
                    }
                }
                if (processedCount < appIdsWithData.length) {
                    console.log(`Waiting ${Math.round(DELAY_MS / 1000)}s before next game...`);
                    yield new Promise(resolve => setTimeout(resolve, DELAY_MS));
                }
            }
            console.log(`\nUpdate process finished. ${totalCreatedCount} games created, ${totalUpdatedCount} games updated.`);
        }
        else {
            console.log(`No app changes to process from Steam. Exiting.`);
        }
        yield saveLatestChangenumber(currentChangenumber);
        console.log(`\nSteam PICS refresh completed.`);
    });
}
function runPicsRefreshService() {
    return __awaiter(this, void 0, void 0, function* () {
        let exitCode = 0;
        try {
            yield performRefresh();
        }
        catch (e) {
            const error = e;
            console.error(`Error in Steam PICS refresh service:`, error.message);
            console.error(error.stack);
            exitCode = 1;
        }
        finally {
            steamUser.logOff();
            process.exit(exitCode);
        }
    });
}
function incrementStat(key_1) {
    return __awaiter(this, arguments, void 0, function* (key, incrementBy = 1) {
        try {
            const { data: existing, error: fetchError } = yield client_1.supabase
                .from('statistics')
                .select('id, count')
                .eq('key', key)
                .single();
            if (fetchError) {
                if (fetchError.code === 'PGRST116') { // No rows returned
                    // Create new stat entry
                    const { error: insertError } = yield client_1.supabase
                        .from('statistics')
                        .insert({ key, count: incrementBy });
                    if (insertError) {
                        console.error(`Failed to create stat for key: ${key}. Error: ${insertError}`);
                    }
                }
                else {
                    console.error(`Failed to fetch stat for key: ${key}. Error: ${fetchError}`);
                }
            }
            else if (existing) {
                const newCount = existing.count + incrementBy;
                const { error: updateError } = yield client_1.supabase
                    .from('statistics')
                    .update({ count: newCount })
                    .eq('id', existing.id);
                if (updateError) {
                    console.error(`Failed to update stat for key: ${key}. Error: ${updateError}`);
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
        console.log(`[Worker ${config_1.default.worker.id}] Syncing achievements for ${steamAppId}...`);
        try {
            const url = `http://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${STEAM_API_KEY}&appid=${steamAppId}`;
            const [schemaResponse, percentagesResponse] = yield Promise.all([
                fetchWithRetry(url),
                fetchWithRetry(`https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid=${steamAppId}`)
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
            const { data: oldAchievements, error: fetchError } = yield client_1.supabase
                .from('achievements')
                .select('id')
                .eq('steam_appid', steamAppId);
            if (fetchError) {
                console.error(`Error fetching old achievements for appid ${steamAppId}:`, fetchError);
            }
            else if (oldAchievements && oldAchievements.length > 0) {
                console.log(`Deleting ${oldAchievements.length} old achievements for appid ${steamAppId}.`);
                const DELETE_BATCH_SIZE = 50;
                for (let i = 0; i < oldAchievements.length; i += DELETE_BATCH_SIZE) {
                    const batch = oldAchievements.slice(i, i + DELETE_BATCH_SIZE);
                    const batchIds = batch.map(doc => doc.id);
                    const { error: deleteError } = yield client_1.supabase
                        .from('achievements')
                        .delete()
                        .in('id', batchIds);
                    if (deleteError) {
                        console.error(`Error deleting achievement batch for appid ${steamAppId}:`, deleteError);
                    }
                }
            }
            // Create new ones in batches
            const CREATE_BATCH_SIZE = 50;
            for (let i = 0; i < achievementsToCreate.length; i += CREATE_BATCH_SIZE) {
                const batch = achievementsToCreate.slice(i, i + CREATE_BATCH_SIZE);
                const { error: createError } = yield client_1.supabase
                    .from('achievements')
                    .insert(batch);
                if (createError) {
                    console.error(`Error creating achievement batch for appid ${steamAppId}:`, createError);
                }
            }
            console.log(`Successfully synced ${achievementsToCreate.length} achievements for appid ${steamAppId}.`);
        }
        catch (error) {
            console.error(`Error syncing achievements for appid ${steamAppId}:`, error);
        }
    });
}
// Execute the PICS refresh service
void runPicsRefreshService();
