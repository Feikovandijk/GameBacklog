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
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables from the root .env file
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../.env') });
const steamUser = new steam_user_1.default();
steamUser.setOptions({
    enablePicsCache: true,
    changelistUpdateInterval: 0,
});
const STEAM_API_KEY = config_1.default.steamApiKey;
if (!STEAM_API_KEY) {
    throw new Error(`Steam API key is missing. Ensure STEAM_API_KEY is defined in your .env file.`);
}
const STEAM_API_BASE_URL = 'https://store.steampowered.com/api/appdetails';
const REVIEW_API_BASE_URL = 'https://store.steampowered.com/appreviews';
const GAMES_PER_MINUTE_LIMIT = 40; // Stay under the 100k/day Steam API limit
const DELAY_MS = 60000 / GAMES_PER_MINUTE_LIMIT;
let rateLimitRetryCount = 0; // State for exponential backoff on 429s
// --- Re-used Type Definitions & Functions from steam-pics-refresh-service ---
function fetchWithRetry(url_1) {
    return __awaiter(this, arguments, void 0, function* (url, retries = 3, backoff = 1000) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = yield fetch(url);
                if (response.ok) {
                    rateLimitRetryCount = 0; // Reset on a successful request
                    return response;
                }
                if (response.status === 429) {
                    const backoffMinutes = 5 * Math.pow(2, rateLimitRetryCount);
                    rateLimitRetryCount++;
                    console.warn(`Rate limit hit (429). Pausing for ${backoffMinutes} minutes...`);
                    yield new Promise(resolve => setTimeout(resolve, backoffMinutes * 60 * 1000));
                    i--; // This makes the loop retry the current attempt after the long pause
                    continue;
                }
                if (response.status >= 400 && response.status < 500) {
                    console.warn(`Request to ${url.replace(STEAM_API_KEY, 'YOUR_STEAM_KEY')} failed with status ${response.status}. Not retrying.`);
                    return response;
                }
                console.warn(`Request to ${url.replace(STEAM_API_KEY, 'YOUR_STEAM_KEY')} failed with status ${response.status}. Retrying...`);
            }
            catch (error) {
                console.warn(`Request failed for ${url.replace(STEAM_API_KEY, 'YOUR_STEAM_KEY')}: ${error.message}. Retrying...`);
            }
            yield new Promise(resolve => setTimeout(resolve, backoff));
            backoff *= 2;
        }
        throw new Error(`Failed to fetch from ${url} after ${retries} attempts.`);
    });
}
function fetchGameDetailsFromWebAPI(steamAppId) {
    return __awaiter(this, void 0, void 0, function* () {
        const appDetailsUrl = `${STEAM_API_BASE_URL}?appids=${steamAppId}&key=${STEAM_API_KEY}`;
        const reviewUrl = `${REVIEW_API_BASE_URL}/${steamAppId}?json=1&purchase_type=all`;
        try {
            const [appDetailsResponse, reviewResponse] = yield Promise.all([
                fetchWithRetry(appDetailsUrl),
                fetchWithRetry(reviewUrl),
            ]);
            if (!appDetailsResponse.ok) {
                return null;
            }
            const appDetailsJson = yield appDetailsResponse.json();
            const appDetails = appDetailsJson[steamAppId];
            if (!(appDetails === null || appDetails === void 0 ? void 0 : appDetails.success)) {
                return null;
            }
            const gameData = appDetails.data;
            if (reviewResponse.ok) {
                const reviewJson = yield reviewResponse.json();
                if (reviewJson.success) {
                    gameData.review_summary = reviewJson.query_summary;
                }
            }
            return gameData;
        }
        catch (error) {
            console.error(`Error fetching from Web API for ${steamAppId}:`, error);
            return null;
        }
    });
}
function formatPicsDataToGameDocument(appId, picsData) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    const common = (_b = (_a = picsData.appinfo) === null || _a === void 0 ? void 0 : _a.common) !== null && _b !== void 0 ? _b : {};
    const developers = [], publishers = [];
    if (common.associations) {
        Object.values(common.associations).forEach((assoc) => {
            if (assoc.type === 'developer') {
                developers.push(String(assoc.name));
            }
            else if (assoc.type === 'publisher') {
                publishers.push(String(assoc.name));
            }
        });
    }
    const oslist = ((_c = common.oslist) === null || _c === void 0 ? void 0 : _c.split(',')) || [];
    let releaseDateForDb = null;
    const ts = common.steam_release_date;
    if (ts) {
        releaseDateForDb = new Date(parseInt(String(ts), 10) * 1000).toISOString();
    }
    const tags = common.store_tags
        ? Object.values(common.store_tags).map(String)
        : [];
    const categories = common.category
        ? Object.keys(common.category)
        : [];
    const has_steam_achievements = categories.includes('category_22');
    let headerImageUrl = null;
    if ((_d = common.header_image) === null || _d === void 0 ? void 0 : _d.english) {
        headerImageUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/${common.header_image.english}`;
    }
    return {
        steam_appid: appId,
        name: common.name,
        last_updated: new Date().toISOString(),
        steam_app_type: (_f = (_e = common.type) === null || _e === void 0 ? void 0 : _e.toLowerCase()) !== null && _f !== void 0 ? _f : 'unknown',
        developers: developers.length > 0 ? developers : null,
        publishers: publishers.length > 0 ? publishers : null,
        release_date: releaseDateForDb,
        header_image: headerImageUrl,
        platforms_windows: oslist.includes('windows'),
        platforms_mac: oslist.includes('macos'),
        platforms_linux: oslist.includes('linux'),
        tags,
        categories,
        has_steam_achievements,
        controller_support: (_g = common.controller_support) !== null && _g !== void 0 ? _g : null,
        metacritic_score: (_j = (_h = common.metacritic) === null || _h === void 0 ? void 0 : _h.score) !== null && _j !== void 0 ? _j : null,
        metacritic_url: (_l = (_k = common.metacritic) === null || _k === void 0 ? void 0 : _k.url) !== null && _l !== void 0 ? _l : null,
        is_early_access: common.releasestate === 'prerelease',
        positive_rating_percentage: common.review_percentage
            ? parseInt(String(common.review_percentage), 10)
            : null,
    };
}
function mergeApiData(picsData, webData) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y;
    const mergedData = Object.assign({}, picsData);
    if (!webData) {
        return mergedData;
    }
    const reviews = webData.review_summary;
    const price = webData.price_overview;
    mergedData.short_description =
        (_a = webData.short_description) !== null && _a !== void 0 ? _a : mergedData.short_description;
    mergedData.total_reviews = (_b = reviews === null || reviews === void 0 ? void 0 : reviews.total_reviews) !== null && _b !== void 0 ? _b : null;
    mergedData.price_final = (_c = price === null || price === void 0 ? void 0 : price.final) !== null && _c !== void 0 ? _c : null;
    mergedData.price_currency = (_d = price === null || price === void 0 ? void 0 : price.currency) !== null && _d !== void 0 ? _d : null;
    mergedData.price_initial = (_e = price === null || price === void 0 ? void 0 : price.initial) !== null && _e !== void 0 ? _e : null;
    mergedData.discount_percent = (_f = price === null || price === void 0 ? void 0 : price.discount_percent) !== null && _f !== void 0 ? _f : null;
    mergedData.total_positive = (_g = reviews === null || reviews === void 0 ? void 0 : reviews.total_positive) !== null && _g !== void 0 ? _g : null;
    mergedData.total_negative = (_h = reviews === null || reviews === void 0 ? void 0 : reviews.total_negative) !== null && _h !== void 0 ? _h : null;
    mergedData.review_score_desc = (_j = reviews === null || reviews === void 0 ? void 0 : reviews.review_score_desc) !== null && _j !== void 0 ? _j : null;
    mergedData.metacritic_score =
        (_l = (_k = webData.metacritic) === null || _k === void 0 ? void 0 : _k.score) !== null && _l !== void 0 ? _l : mergedData.metacritic_score;
    mergedData.metacritic_url =
        (_o = (_m = webData.metacritic) === null || _m === void 0 ? void 0 : _m.url) !== null && _o !== void 0 ? _o : mergedData.metacritic_url;
    mergedData.genres = webData.genres
        ? webData.genres.map(g => g.description)
        : null;
    // Add all new fields
    mergedData.detailed_description = (_p = webData.detailed_description) !== null && _p !== void 0 ? _p : null;
    mergedData.about_the_game = (_q = webData.about_the_game) !== null && _q !== void 0 ? _q : null;
    mergedData.website = (_r = webData.website) !== null && _r !== void 0 ? _r : null;
    mergedData.screenshots = webData.screenshots
        ? webData.screenshots.map(s => s.path_full)
        : null;
    mergedData.movies = webData.movies
        ? webData.movies.map(m => m.mp4.max)
        : null;
    mergedData.is_free = (_s = webData.is_free) !== null && _s !== void 0 ? _s : false;
    mergedData.pc_requirements = (_t = webData.pc_requirements) !== null && _t !== void 0 ? _t : null;
    mergedData.mac_requirements = (_u = webData.mac_requirements) !== null && _u !== void 0 ? _u : null;
    mergedData.linux_requirements = (_v = webData.linux_requirements) !== null && _v !== void 0 ? _v : null;
    mergedData.supported_languages = (_w = webData.supported_languages) !== null && _w !== void 0 ? _w : null;
    mergedData.dlc = (_x = webData.dlc) !== null && _x !== void 0 ? _x : null;
    mergedData.required_age = (_y = webData.required_age) !== null && _y !== void 0 ? _y : null;
    if ((reviews === null || reviews === void 0 ? void 0 : reviews.total_reviews) &&
        reviews.total_reviews > 0 &&
        typeof reviews.total_positive === 'number') {
        mergedData.positive_rating_percentage = Math.round((reviews.total_positive / reviews.total_reviews) * 100);
    }
    return mergedData;
}
// --- Main Backfill Logic ---
function enrichAllGames() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`Starting one-time enrichment...`);
        let totalUpdatedCount = 0;
        let totalProcessedCount = 0;
        try {
            console.log(`Logging into Steam anonymously...`);
            steamUser.logOn({ anonymous: true });
            yield new Promise((resolve, reject) => {
                steamUser.on('loggedOn', () => {
                    console.log(`Logged into Steam successfully.`);
                    resolve();
                });
                steamUser.on('error', err => {
                    console.error(`Steam login error:`, err);
                    reject(err);
                });
            });
            const BATCH_SIZE = 100;
            let page = 0;
            let hasMore = true;
            while (hasMore) {
                const offset = page * BATCH_SIZE;
                console.log(`\nFetching batch of games from offset ${offset} (processed: ${totalProcessedCount})...`);
                const { data: gameBatch, error: batchError } = yield client_1.supabase
                    .from('games')
                    .select('*')
                    .range(offset, offset + BATCH_SIZE - 1);
                if (batchError) {
                    console.error('Error fetching games batch:', batchError);
                    break;
                }
                if (!gameBatch || gameBatch.length === 0) {
                    hasMore = false;
                    continue;
                }
                for (let index = 0; index < gameBatch.length; index++) {
                    const game = gameBatch[index];
                    if (!game.steam_appid) {
                        console.warn(`Game document ${game.id} has no steam_appid, skipping.`);
                        continue;
                    }
                    console.log(`(${totalProcessedCount + 1}) Processing game: ${game.name} (ID: ${game.steam_appid})`);
                    const picsPromise = new Promise(resolve => {
                        void steamUser.getProductInfo([Number(game.steam_appid)], [], false, (err, apps) => { var _a; return resolve((_a = apps === null || apps === void 0 ? void 0 : apps[game.steam_appid]) !== null && _a !== void 0 ? _a : null); });
                    });
                    const webApiPromise = fetchGameDetailsFromWebAPI(Number(game.steam_appid));
                    const [picsData, webApiData] = yield Promise.all([
                        picsPromise,
                        webApiPromise,
                    ]);
                    if (picsData) {
                        const formattedPicsData = formatPicsDataToGameDocument(Number(game.steam_appid), picsData);
                        const finalGameData = mergeApiData(formattedPicsData, webApiData);
                        const { error: updateError } = yield client_1.supabase
                            .from('games')
                            .update(finalGameData)
                            .eq('id', game.id);
                        if (updateError) {
                            console.error(`Error updating game ${game.name}:`, updateError);
                        }
                        else {
                            totalUpdatedCount++;
                        }
                    }
                    else {
                        console.warn(`Could not get PICS data for ${game.name}, skipping update.`);
                    }
                    totalProcessedCount++;
                    if (index < gameBatch.length - 1) {
                        yield new Promise(resolve => setTimeout(resolve, DELAY_MS));
                    }
                }
                page++;
            }
            console.log(`\nEnrichment complete! Processed: ${totalProcessedCount}, Updated: ${totalUpdatedCount}`);
            steamUser.logOff();
        }
        catch (e) {
            const error = e;
            console.error(`\nError during enrichment service:`, error.message);
            console.error(error.stack);
            steamUser.logOff();
            process.exit(1);
        }
    });
}
// Execute the enrichment process
void enrichAllGames();
