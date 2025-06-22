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
exports.runPicsRefreshService = runPicsRefreshService;
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
const GAMES_PER_MINUTE_LIMIT = 30; // Stay under the 100k/day Steam API limit
const DELAY_MS = 60000 / GAMES_PER_MINUTE_LIMIT;
const STATE_DOCUMENT_ID = 'steam_changenumber';
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
function getLatestChangenumber() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const doc = yield databases.getDocument(config_1.default.appwrite.databaseId, 'steam_state', STATE_DOCUMENT_ID);
            return doc.changenumber;
        }
        catch (error) {
            if (error.code === 404) {
                console.log('Changenumber document not found, will start from scratch.');
                return 0;
            }
            throw error;
        }
    });
}
function saveLatestChangenumber(changenumber) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield databases.updateDocument(config_1.default.appwrite.databaseId, 'steam_state', STATE_DOCUMENT_ID, { changenumber });
            console.log(`Successfully saved new changenumber: ${changenumber}`);
        }
        catch (error) {
            if (error.code === 404) {
                console.log('Changenumber document not found, creating a new one.');
                yield databases.createDocument(config_1.default.appwrite.databaseId, 'steam_state', STATE_DOCUMENT_ID, { changenumber });
                console.log(`Successfully created and saved new changenumber: ${changenumber}`);
            }
            else {
                console.error(`Error saving new changenumber ${changenumber}:`, error);
            }
        }
    });
}
function formatPicsDataToGameDocument(appId, picsData) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    const common = (_b = (_a = picsData.appinfo) === null || _a === void 0 ? void 0 : _a.common) !== null && _b !== void 0 ? _b : {};
    const extended = (_d = (_c = picsData.appinfo) === null || _c === void 0 ? void 0 : _c.extended) !== null && _d !== void 0 ? _d : {};
    const developers = [];
    const publishers = [];
    if (common.associations) {
        Object.values(common.associations).forEach((assoc) => {
            if (assoc.type === 'developer') {
                developers.push(assoc.name);
            }
            else if (assoc.type === 'publisher') {
                publishers.push(assoc.name);
            }
        });
    }
    const oslist = ((_e = common.oslist) === null || _e === void 0 ? void 0 : _e.split(',')) || [];
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
    if ((_f = common.header_image) === null || _f === void 0 ? void 0 : _f.english) {
        headerImageUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/${common.header_image.english}`;
    }
    return {
        steam_appid: appId,
        name: common.name,
        last_updated: new Date().toISOString(),
        steam_app_type: (_h = (_g = common.type) === null || _g === void 0 ? void 0 : _g.toLowerCase()) !== null && _h !== void 0 ? _h : 'unknown',
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
        controller_support: (_j = common.controller_support) !== null && _j !== void 0 ? _j : null,
        metacritic_score: (_l = (_k = common.metacritic) === null || _k === void 0 ? void 0 : _k.score) !== null && _l !== void 0 ? _l : null,
        metacritic_url: (_o = (_m = common.metacritic) === null || _m === void 0 ? void 0 : _m.url) !== null && _o !== void 0 ? _o : null,
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    const mergedData = Object.assign({}, picsData);
    if (!webData) {
        return mergedData;
    }
    const reviews = webData.review_summary;
    const price = webData.price_overview;
    mergedData.short_description = (_a = webData.short_description) !== null && _a !== void 0 ? _a : mergedData.short_description;
    mergedData.total_reviews = (_b = reviews === null || reviews === void 0 ? void 0 : reviews.total_reviews) !== null && _b !== void 0 ? _b : null,
        mergedData.price_final = (_c = price === null || price === void 0 ? void 0 : price.final) !== null && _c !== void 0 ? _c : null,
        mergedData.price_currency = (_d = price === null || price === void 0 ? void 0 : price.currency) !== null && _d !== void 0 ? _d : null,
        mergedData.price_initial = (_e = price === null || price === void 0 ? void 0 : price.initial) !== null && _e !== void 0 ? _e : null,
        mergedData.discount_percent = (_f = price === null || price === void 0 ? void 0 : price.discount_percent) !== null && _f !== void 0 ? _f : null,
        mergedData.total_positive = (_g = reviews === null || reviews === void 0 ? void 0 : reviews.total_positive) !== null && _g !== void 0 ? _g : null,
        mergedData.total_negative = (_h = reviews === null || reviews === void 0 ? void 0 : reviews.total_negative) !== null && _h !== void 0 ? _h : null,
        mergedData.review_score_desc = (_j = reviews === null || reviews === void 0 ? void 0 : reviews.review_score_desc) !== null && _j !== void 0 ? _j : null,
        mergedData.current_players = (_k = webData.player_count) !== null && _k !== void 0 ? _k : null,
        // Web API sometimes has better metacritic data
        mergedData.metacritic_score = (_m = (_l = webData.metacritic) === null || _l === void 0 ? void 0 : _l.score) !== null && _m !== void 0 ? _m : mergedData.metacritic_score;
    mergedData.metacritic_url = (_p = (_o = webData.metacritic) === null || _o === void 0 ? void 0 : _o.url) !== null && _p !== void 0 ? _p : mergedData.metacritic_url;
    // The positive rating percentage can be calculated more accurately from web data
    if ((reviews === null || reviews === void 0 ? void 0 : reviews.total_reviews) && reviews.total_reviews > 0) {
        mergedData.positive_rating_percentage = Math.round((reviews.total_positive / reviews.total_reviews) * 100);
    }
    return mergedData;
}
function runPicsRefreshService() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Steam PICS refresh service started.");
        let totalUpdatedCount = 0;
        try {
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
            const lastChangenumber = yield getLatestChangenumber();
            console.log(`Last known changenumber is ${lastChangenumber}. Fetching changes...`);
            const productChanges = yield new Promise((resolve, reject) => {
                steamUser.getProductChanges(lastChangenumber, (err, currentChangenumber, appChanges, packageChanges) => {
                    if (err)
                        return reject(err);
                    resolve({ currentChangenumber, appChanges, packageChanges });
                });
            });
            const { currentChangenumber, appChanges } = productChanges;
            if (appChanges.length === 0 && currentChangenumber === lastChangenumber) {
                console.log("No new changes from Steam. Exiting.");
                steamUser.logOff();
                return;
            }
            console.log(`Received ${appChanges.length} app changes. Current changenumber is ${currentChangenumber}.`);
            const appIdsToUpdate = appChanges.map(app => app.appid);
            if (appIdsToUpdate.length > 0) {
                // Find which of the changed AppIDs exist in our database
                const CHUNK_SIZE = 100;
                const gameDocsByAppId = new Map();
                for (let i = 0; i < appIdsToUpdate.length; i += CHUNK_SIZE) {
                    const chunk = appIdsToUpdate.slice(i, i + CHUNK_SIZE);
                    const response = yield databases.listDocuments(config_1.default.appwrite.databaseId, config_1.default.appwrite.gamesCollectionId, [node_appwrite_1.Query.equal('steam_appid', chunk), node_appwrite_1.Query.limit(CHUNK_SIZE)]);
                    response.documents.forEach(doc => gameDocsByAppId.set(doc.steam_appid, doc));
                }
                const appIdsInDb = Array.from(gameDocsByAppId.keys());
                console.log(`Found ${appIdsInDb.length} games in the database that require an update. Fetching data...`);
                if (appIdsInDb.length > 0) {
                    steamUser.getProductInfo(appIdsInDb, [], false, (err, apps, packages) => __awaiter(this, void 0, void 0, function* () {
                        if (err) {
                            console.error('Failed to get product info from Steam:', err);
                            steamUser.logOff();
                            return;
                        }
                        for (const appIdStr in apps) {
                            const appId = parseInt(appIdStr, 10);
                            const picsData = apps[appIdStr];
                            const gameDoc = gameDocsByAppId.get(appId);
                            if (gameDoc && picsData.appinfo) {
                                const formattedPicsData = formatPicsDataToGameDocument(appId, picsData);
                                const webApiData = yield fetchGameDetailsFromWebAPI(appId);
                                const finalGameData = mergeApiData(formattedPicsData, webApiData);
                                try {
                                    yield databases.updateDocument(config_1.default.appwrite.databaseId, config_1.default.appwrite.gamesCollectionId, gameDoc.$id, finalGameData);
                                    console.log(`Successfully updated game: ${finalGameData.name} (${finalGameData.steam_appid})`);
                                    totalUpdatedCount++;
                                    yield incrementStat('updatedGames');
                                    if (finalGameData.has_steam_achievements) {
                                        console.log(`Game ${finalGameData.name} has achievements. Syncing...`);
                                        yield syncGameAchievements(gameDoc.$id, appId);
                                    }
                                }
                                catch (e) {
                                    console.error(`Error updating game ${finalGameData.name} in Appwrite:`, e);
                                }
                            }
                            else {
                                const gameDoc = gameDocsByAppId.get(appId);
                                if (gameDoc) {
                                    const updatePayload = {
                                        last_updated: new Date().toISOString(),
                                        steam_app_type: 'invalid',
                                    };
                                    yield databases.updateDocument(config_1.default.appwrite.databaseId, config_1.default.appwrite.gamesCollectionId, gameDoc.$id, updatePayload);
                                    console.log(`Marked appid ${appId} as invalid as no PICS info was returned.`);
                                }
                            }
                        }
                        console.log(`\nUpdate process finished. ${totalUpdatedCount} games were updated.`);
                        yield saveLatestChangenumber(currentChangenumber);
                        console.log(`\nSteam PICS refresh completed.`);
                        steamUser.logOff();
                    }));
                }
                else {
                    yield saveLatestChangenumber(currentChangenumber);
                    console.log(`No games in the database matched the list of changes. Changenumber updated. Exiting.`);
                    steamUser.logOff();
                }
            }
            else {
                yield saveLatestChangenumber(currentChangenumber);
                console.log(`No app changes from Steam, but changenumber updated. Exiting.`);
                steamUser.logOff();
            }
        }
        catch (e) {
            const error = e;
            console.error(`Error in Steam PICS refresh service:`, error.message);
            console.error(error.stack);
            steamUser.logOff();
            process.exit(1);
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
            const oldAchievementsToDelete = [];
            let hasMore = true;
            let cursor;
            while (hasMore) {
                const queries = [node_appwrite_1.Query.equal('steam_appid', steamAppId), node_appwrite_1.Query.limit(100)];
                if (cursor) {
                    queries.push(node_appwrite_1.Query.cursorAfter(cursor));
                }
                const oldAchievements = yield databases.listDocuments(config_1.default.appwrite.databaseId, 'achievements', queries);
                if (oldAchievements.documents.length > 0) {
                    oldAchievementsToDelete.push(...oldAchievements.documents);
                    cursor = oldAchievements.documents[oldAchievements.documents.length - 1].$id;
                }
                else {
                    hasMore = false;
                }
            }
            if (oldAchievementsToDelete.length > 0) {
                console.log(`Deleting ${oldAchievementsToDelete.length} old achievements for appid ${steamAppId}.`);
                const deletePromises = oldAchievementsToDelete.map(doc => databases.deleteDocument(config_1.default.appwrite.databaseId, 'achievements', doc.$id));
                yield Promise.all(deletePromises);
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
function testGetProductInfo(steamAppId) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`[Test] Fetching Product Info for AppID: ${steamAppId}`);
        return new Promise((resolve, reject) => {
            steamUser.logOn({ anonymous: true });
            steamUser.on('loggedOn', () => {
                console.log('[Test] Logged into Steam successfully.');
                steamUser.getProductInfo([steamAppId], [], false, (err, apps, packages) => {
                    if (err) {
                        console.error('[Test] Error getting product info:', err);
                        steamUser.logOff();
                        return reject(err);
                    }
                    console.log('[Test] --- Raw PICS Response ---');
                    console.log(JSON.stringify(apps[steamAppId], null, 2));
                    steamUser.logOff();
                    resolve();
                });
            });
            steamUser.on('error', (err) => {
                console.error('[Test] Steam login error:', err);
                reject(err);
            });
        });
    });
}
// Autorun the service when the script is executed
if (require.main === module) {
    runPicsRefreshService();
}
