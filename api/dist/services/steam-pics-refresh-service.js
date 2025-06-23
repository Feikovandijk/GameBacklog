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
            const doc = yield databases.getDocument(config_1.default.appwrite.databaseId, STATE_COLLECTION_ID, STATE_DOCUMENT_ID);
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
            yield databases.updateDocument(config_1.default.appwrite.databaseId, STATE_COLLECTION_ID, STATE_DOCUMENT_ID, { changenumber });
            console.log(`Successfully saved new changenumber: ${changenumber}`);
        }
        catch (error) {
            if (error.code === 404) {
                console.log('Changenumber document not found, creating a new one.');
                yield databases.createDocument(config_1.default.appwrite.databaseId, STATE_COLLECTION_ID, STATE_DOCUMENT_ID, { changenumber });
                console.log(`Successfully created and saved new changenumber: ${changenumber}`);
            }
            else {
                console.error(`Error saving new changenumber ${changenumber}:`, error);
            }
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
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
                    steamUser.getProductInfo(appIdsInDb, [], false, (err, apps) => __awaiter(this, void 0, void 0, function* () {
                        if (err) {
                            console.error('Failed to get product info from Steam:', err);
                            steamUser.logOff();
                            return;
                        }
                        const appIdsToProcess = Object.keys(apps);
                        const appCount = appIdsToProcess.length;
                        let processedCount = 0;
                        for (const appIdStr of appIdsToProcess) {
                            processedCount++;
                            const appId = parseInt(appIdStr, 10);
                            const picsData = apps[appIdStr];
                            const gameDoc = gameDocsByAppId.get(appId);
                            if (gameDoc && picsData.appinfo) {
                                const formattedPicsData = formatPicsDataToGameDocument(appId, picsData);
                                const webApiData = yield fetchGameDetailsFromWebAPI(appId);
                                const finalGameData = mergeApiData(formattedPicsData, webApiData);
                                try {
                                    yield databases.updateDocument(config_1.default.appwrite.databaseId, config_1.default.appwrite.gamesCollectionId, gameDoc.$id, finalGameData);
                                    console.log(`(${processedCount}/${appCount}) Successfully updated game: ${finalGameData.name} (${finalGameData.steam_appid})`);
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
                                    console.log(`(${processedCount}/${appCount}) Marked appid ${appId} as invalid as no PICS info was returned.`);
                                }
                            }
                            if (processedCount < appCount) {
                                console.log(`Waiting ${Math.round(DELAY_MS / 1000)}s before next game...`);
                                yield new Promise(resolve => setTimeout(resolve, DELAY_MS));
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
        // We're done, log off
        steamUser.logOff();
    });
}
// Execute the PICS refresh service
void runPicsRefreshService();
