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
const node_appwrite_1 = require("node-appwrite");
const steam_user_1 = __importDefault(require("steam-user"));
const config_1 = __importDefault(require("../config"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables from the root .env file
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../.env') });
const client = new node_appwrite_1.Client();
client
    .setEndpoint(config_1.default.appwrite.endpoint)
    .setProject(config_1.default.appwrite.projectId)
    .setKey(config_1.default.appwrite.apiKey);
const databases = new node_appwrite_1.Databases(client);
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
        console.log(`Fetching app details from: ${appDetailsUrl.replace(STEAM_API_KEY, 'YOUR_STEAM_KEY')}`);
        console.log(`Fetching reviews from: ${reviewUrl}`);
        console.log(`Fetching player count from: ${playersUrl}`);
        console.log(`Fetching PICS data for: ${steamAppId}`);
        try {
            const productInfoPromise = new Promise((resolve) => {
                steamUser.getProductInfo([steamAppId], [], false, (err, apps, packages) => {
                    resolve({ err, apps, packages });
                });
            });
            const [appDetailsResponse, reviewResponse, playersResponse, picsResponse] = yield Promise.all([
                fetchWithRetry(appDetailsUrl),
                fetchWithRetry(reviewUrl),
                fetchWithRetry(playersUrl),
                productInfoPromise
            ]);
            if (!appDetailsResponse.ok) {
                console.error(`Steam API request failed for appid ${steamAppId}: ${appDetailsResponse.status} ${appDetailsResponse.statusText}`);
                const errorBody = yield appDetailsResponse.text();
                console.error(`Steam API Error Body: ${errorBody}`);
                return { data: null, type: 'error' };
            }
            const appDetailsData = yield appDetailsResponse.json();
            let reviewData = null;
            let playersData = null;
            if (reviewResponse.ok) {
                const reviewJson = yield reviewResponse.json();
                if (reviewJson.success) {
                    reviewData = reviewJson.query_summary;
                }
                else {
                    console.warn(`Could not fetch review data for appid ${steamAppId}.`);
                }
            }
            else {
                console.warn(`Review API request failed for appid ${steamAppId}: ${reviewResponse.status} ${reviewResponse.statusText}`);
            }
            if (playersResponse.ok) {
                const playersJson = yield playersResponse.json();
                if (playersJson.response && playersJson.response.result === 1) {
                    playersData = playersJson.response;
                }
            }
            else {
                console.warn(`Player count API request failed for appid ${steamAppId}: ${playersResponse.status} ${playersResponse.statusText}`);
            }
            if (appDetailsData && appDetailsData[steamAppId]) {
                const details = appDetailsData[steamAppId];
                if (details.success) {
                    const gameData = details.data;
                    const appType = gameData.type || 'game'; // Default to 'game' if type is missing
                    if (appType !== 'game') {
                        console.log(`AppID ${steamAppId} is a '${appType}', not a game. Skipping full data processing.`);
                        return { data: null, type: appType };
                    }
                    if (reviewData) {
                        gameData.recommendations = {
                            total: reviewData.total_reviews,
                            positive: reviewData.total_positive,
                            negative: reviewData.total_negative,
                            review_score_desc: reviewData.review_score_desc
                        };
                    }
                    if (playersData) {
                        gameData.player_count = playersData.player_count;
                    }
                    if (picsResponse.err) {
                        console.warn(`Could not fetch PICS data for ${steamAppId}:`, picsResponse.err.message);
                    }
                    else {
                        gameData.pics_info = picsResponse.apps[steamAppId];
                    }
                    return { data: gameData, type: 'game' };
                }
                else {
                    console.warn(`Steam indicated unsuccessful fetch for appid ${steamAppId}. Marking as invalid.`);
                    return { data: null, type: 'invalid' };
                }
            }
            console.warn(`No data or unexpected response structure for appid ${steamAppId} from Steam.`);
            return { data: null, type: null };
        }
        catch (error) {
            console.error(`Error fetching game details for appid ${steamAppId} from Steam:`, error);
            return { data: null, type: 'error' };
        }
    });
}
function recordReviewHistory(documentId, totalReviews) {
    return __awaiter(this, void 0, void 0, function* () {
        if (typeof totalReviews !== 'number')
            return; // Don't record if no review data
        const historyData = {
            game_id: documentId,
            date: new Date().toISOString(),
            total_reviews: totalReviews,
        };
        try {
            yield databases.createDocument(config_1.default.appwrite.databaseId, 'review_history', node_appwrite_1.ID.unique(), historyData);
            console.log(`Successfully recorded review history for document ${documentId}.`);
        }
        catch (error) {
            console.error(`Error recording review history for document ${documentId}:`, error);
        }
    });
}
function updateGameInAppwrite(documentId, steamData, steamAppType) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2;
        if (steamData && steamAppType === 'game') {
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
            const reviews = steamData.recommendations;
            const picsInfo = (_c = steamData.pics_info) === null || _c === void 0 ? void 0 : _c.appinfo;
            const categories = (_e = (_d = steamData.categories) === null || _d === void 0 ? void 0 : _d.map(c => c.description)) !== null && _e !== void 0 ? _e : [];
            const hasSteamAchievements = categories.includes("Steam Achievements");
            let tags;
            if ((_f = picsInfo === null || picsInfo === void 0 ? void 0 : picsInfo.common) === null || _f === void 0 ? void 0 : _f.tags) {
                tags = Object.values(picsInfo.common.tags);
            }
            const gameData = {
                name: steamData.name,
                short_description: steamData.short_description,
                header_image: steamData.header_image,
                release_date: releaseDateForDb !== null && releaseDateForDb !== void 0 ? releaseDateForDb : null,
                last_updated: new Date().toISOString(),
                developers: steamData.developers,
                publishers: steamData.publishers,
                is_early_access: isEarlyAccess,
                total_reviews: (_g = reviews === null || reviews === void 0 ? void 0 : reviews.total) !== null && _g !== void 0 ? _g : null,
                steam_app_type: 'game',
                // New analytics fields
                price_final: (_h = price === null || price === void 0 ? void 0 : price.final) !== null && _h !== void 0 ? _h : null,
                price_currency: (_j = price === null || price === void 0 ? void 0 : price.currency) !== null && _j !== void 0 ? _j : null,
                price_initial: (_k = price === null || price === void 0 ? void 0 : price.initial) !== null && _k !== void 0 ? _k : null,
                discount_percent: (_l = price === null || price === void 0 ? void 0 : price.discount_percent) !== null && _l !== void 0 ? _l : null,
                total_positive: (_m = reviews === null || reviews === void 0 ? void 0 : reviews.positive) !== null && _m !== void 0 ? _m : null,
                total_negative: (_o = reviews === null || reviews === void 0 ? void 0 : reviews.negative) !== null && _o !== void 0 ? _o : null,
                positive_rating_percentage: (reviews === null || reviews === void 0 ? void 0 : reviews.total) && (reviews === null || reviews === void 0 ? void 0 : reviews.total) > 0 ? Math.round((reviews.positive / reviews.total) * 100) : null,
                review_score_desc: (_p = reviews === null || reviews === void 0 ? void 0 : reviews.review_score_desc) !== null && _p !== void 0 ? _p : null,
                current_players: (_q = steamData.player_count) !== null && _q !== void 0 ? _q : null,
                // From PICS
                tags: tags !== null && tags !== void 0 ? tags : null,
                controller_support: (_s = (_r = picsInfo === null || picsInfo === void 0 ? void 0 : picsInfo.common) === null || _r === void 0 ? void 0 : _r.controller_support) !== null && _s !== void 0 ? _s : null,
                // New Features
                metacritic_score: (_u = (_t = steamData.metacritic) === null || _t === void 0 ? void 0 : _t.score) !== null && _u !== void 0 ? _u : null,
                metacritic_url: (_w = (_v = steamData.metacritic) === null || _v === void 0 ? void 0 : _v.url) !== null && _w !== void 0 ? _w : null,
                platforms_windows: (_y = (_x = steamData.platforms) === null || _x === void 0 ? void 0 : _x.windows) !== null && _y !== void 0 ? _y : null,
                platforms_mac: (_0 = (_z = steamData.platforms) === null || _z === void 0 ? void 0 : _z.mac) !== null && _0 !== void 0 ? _0 : null,
                platforms_linux: (_2 = (_1 = steamData.platforms) === null || _1 === void 0 ? void 0 : _1.linux) !== null && _2 !== void 0 ? _2 : null,
                categories: categories.length > 0 ? categories : null,
                has_steam_achievements: hasSteamAchievements,
            };
            try {
                yield databases.updateDocument(config_1.default.appwrite.databaseId, config_1.default.appwrite.gamesCollectionId, documentId, gameData);
                console.log(`Successfully updated game ${steamData.name}`);
                if (hasSteamAchievements) {
                    console.log(`Game ${steamData.name} has achievements. Syncing...`);
                    yield syncGameAchievements(documentId, steamData.steam_appid);
                }
                // After successful update, record the review count for trend analysis
                if (reviews === null || reviews === void 0 ? void 0 : reviews.total) {
                    yield recordReviewHistory(documentId, reviews.total);
                }
                return true;
            }
            catch (error) {
                console.error(`Error updating game ${steamData.name} in Appwrite:`, error);
                return false;
            }
        }
        else {
            // This is not a game (demo, dlc, invalid, etc.)
            // Just mark it so we don't check it again.
            const gameData = {
                last_updated: new Date().toISOString(),
                steam_app_type: steamAppType,
            };
            try {
                yield databases.updateDocument(config_1.default.appwrite.databaseId, config_1.default.appwrite.gamesCollectionId, documentId, gameData);
                console.log(`Marked document ${documentId} as type '${steamAppType}'. It will be skipped in future updates.`);
                return false; // Return false because it wasn't a "successful game update"
            }
            catch (error) {
                console.error(`Error marking document ${documentId} as '${steamAppType}':`, error);
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
            const BATCH_SIZE = 250; // Number of games each worker will process in its batch
            let currentOffset = config_1.default.worker.id * BATCH_SIZE;
            while (true) {
                const thresholdDate = new Date();
                thresholdDate.setDate(thresholdDate.getDate() - UPDATE_INTERVAL_DAYS);
                console.log(`\n[Worker ${config_1.default.worker.id}/${config_1.default.worker.total}] Fetching batch of games starting from offset ${currentOffset}...`);
                // --- Fetch a batch of games that have never been updated ---
                const neverUpdatedResponse = yield databases.listDocuments(config_1.default.appwrite.databaseId, config_1.default.appwrite.gamesCollectionId, [
                    node_appwrite_1.Query.isNull('last_updated'),
                    node_appwrite_1.Query.orderDesc('steam_appid'),
                    node_appwrite_1.Query.limit(BATCH_SIZE),
                    node_appwrite_1.Query.offset(currentOffset)
                ]);
                // --- Fetch a batch of games that were updated long ago ---
                const oldGamesFilter = [node_appwrite_1.Query.lessThan('last_updated', thresholdDate.toISOString()), node_appwrite_1.Query.equal('steam_app_type', 'game')];
                const oldGamesResponse = yield databases.listDocuments(config_1.default.appwrite.databaseId, config_1.default.appwrite.gamesCollectionId, [
                    ...oldGamesFilter,
                    node_appwrite_1.Query.orderDesc('steam_appid'),
                    node_appwrite_1.Query.limit(BATCH_SIZE),
                    node_appwrite_1.Query.offset(currentOffset)
                ]);
                // Combine, deduplicate, and get the top N newest games to process
                const allStaleGames = [...neverUpdatedResponse.documents, ...oldGamesResponse.documents];
                const staleGamesMap = new Map();
                allStaleGames.forEach(game => staleGamesMap.set(game.$id, game));
                const staleGames = Array.from(staleGamesMap.values())
                    .sort((a, b) => (b.steam_appid || 0) - (a.steam_appid || 0))
                    .slice(0, BATCH_SIZE);
                if (staleGames.length === 0) {
                    console.log(`[Worker ${config_1.default.worker.id}/${config_1.default.worker.total}] No more stale games found at this offset. Worker will exit.`);
                    break; // Exit the while loop
                }
                console.log(`[Worker ${config_1.default.worker.id}/${config_1.default.worker.total}] Found ${staleGames.length} games. Starting batch processing...`);
                for (const [index, game] of staleGames.entries()) {
                    if (!game.steam_appid) {
                        console.warn(`[Worker ${config_1.default.worker.id}/${config_1.default.worker.total}] Game document ${game.$id} has no steam_appid, skipping.`);
                        continue;
                    }
                    console.log(`[Worker ${config_1.default.worker.id}/${config_1.default.worker.total}] Processing game: ${game.name} (Steam AppID: ${game.steam_appid})`);
                    const steamResponse = yield fetchGameDetailsFromSteam(game.steam_appid);
                    if (steamResponse.type) {
                        const success = yield updateGameInAppwrite(game.$id, steamResponse.data, steamResponse.type);
                        if (success) {
                            totalUpdatedCount++;
                            // Increment the stat immediately after a successful update
                            yield incrementStat('updatedGames');
                        }
                    }
                    if (index < staleGames.length - 1) {
                        console.log(`[Worker ${config_1.default.worker.id}/${config_1.default.worker.total}] Waiting for ${DELAY_MS / 1000} seconds before next Steam API call...`);
                        yield new Promise(resolve => setTimeout(resolve, DELAY_MS));
                    }
                }
                console.log(`[Worker ${config_1.default.worker.id}/${config_1.default.worker.total}] Batch finished. Total updated by this worker: ${totalUpdatedCount}.`);
                // Move to the next block of work
                currentOffset += config_1.default.worker.total * BATCH_SIZE;
            }
            console.log(`\n[Worker ${config_1.default.worker.id}/${config_1.default.worker.total}] Steam refresh completed.`);
            steamUser.logOff();
        }
        catch (e) {
            const error = e;
            console.error(`[Worker ${config_1.default.worker.id}/${config_1.default.worker.total}] Error in Steam refresh service:`, error.message);
            steamUser.logOff();
            process.exit(1); // Exit with error for schedulers to pick up failure
        }
    });
}
function incrementStat(key_1) {
    return __awaiter(this, arguments, void 0, function* (key, incrementBy = 1) {
        const dbId = config_1.default.appwrite.databaseId;
        const statsCollectionId = 'statistics';
        try {
            const existing = yield databases.listDocuments(dbId, statsCollectionId, [node_appwrite_1.Query.equal('key', key)]);
            if (existing.documents.length > 0) {
                const doc = existing.documents[0];
                const newCount = doc.count + incrementBy;
                yield databases.updateDocument(dbId, statsCollectionId, doc.$id, { count: newCount });
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
            let hasMore = true;
            let cursor;
            while (hasMore) {
                const queries = [node_appwrite_1.Query.equal('steam_appid', steamAppId), node_appwrite_1.Query.limit(100)];
                if (cursor) {
                    queries.push(node_appwrite_1.Query.cursorAfter(cursor));
                }
                const oldAchievements = yield databases.listDocuments(config_1.default.appwrite.databaseId, 'achievements', queries);
                if (oldAchievements.documents.length > 0) {
                    const deletePromises = oldAchievements.documents.map(doc => databases.deleteDocument(config_1.default.appwrite.databaseId, 'achievements', doc.$id));
                    yield Promise.all(deletePromises);
                    cursor = oldAchievements.documents[oldAchievements.documents.length - 1].$id;
                }
                else {
                    hasMore = false;
                }
            }
            // Create new ones in batches
            const BATCH_SIZE = 50;
            for (let i = 0; i < achievementsToCreate.length; i += BATCH_SIZE) {
                const batch = achievementsToCreate.slice(i, i + BATCH_SIZE);
                const createPromises = batch.map(ach => databases.createDocument(config_1.default.appwrite.databaseId, 'achievements', node_appwrite_1.ID.unique(), ach));
                yield Promise.all(createPromises);
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
