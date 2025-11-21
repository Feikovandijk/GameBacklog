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
const client_1 = require("../supabase/client");
const config_1 = __importDefault(require("../config"));
// Fetches the full list of all Steam games
function fetchSteamGames() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!config_1.default.steamApiKey) {
            console.error('Steam API key is missing. Cannot fetch games list.');
            return [];
        }
        // New endpoint: IStoreService/GetAppList/v1 (Requires API Key)
        // Old endpoint: ISteamApps/GetAppList/v2 (Deprecated/Removed)
        const url = `https://api.steampowered.com/IStoreService/GetAppList/v1/?key=${config_1.default.steamApiKey}&include_games=true&include_dlc=false&include_software=false&include_videos=false&include_hardware=false`;
        try {
            const response = yield fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = yield response.json();
            // New response structure: { response: { apps: [...] } }
            return data.response.apps;
        }
        catch (error) {
            console.error('Failed to fetch Steam games list:', error);
            return []; // Return empty array on failure
        }
    });
}
// Fetches all game IDs currently in the Supabase database
function getExistingGameIds() {
    return __awaiter(this, void 0, void 0, function* () {
        const existingIds = new Set();
        let hasMore = true;
        let page = 0;
        const pageSize = 5000;
        console.log('Fetching existing game IDs page by page...');
        while (hasMore) {
            const { data, error } = yield client_1.supabase
                .from('games')
                .select('steam_appid')
                .range(page * pageSize, (page + 1) * pageSize - 1);
            if (error) {
                console.error('Error fetching existing game IDs from Supabase:', error);
                hasMore = false;
                break;
            }
            if (data.length > 0) {
                data.forEach(doc => {
                    if (doc.steam_appid) {
                        existingIds.add(Number(doc.steam_appid));
                    }
                });
                console.log(`Page ${page + 1}: Fetched ${data.length} documents. Total unique so far: ${existingIds.size}`);
                page++;
                if (data.length < pageSize) {
                    hasMore = false;
                }
            }
            else {
                hasMore = false;
            }
        }
        return existingIds;
    });
}
// Adds new games to the Supabase database in batches
function addNewGames(newGames) {
    return __awaiter(this, void 0, void 0, function* () {
        const BATCH_SIZE = 100;
        for (let i = 0; i < newGames.length; i += BATCH_SIZE) {
            const batch = newGames.slice(i, i + BATCH_SIZE);
            const gamesToInsert = batch.map(game => ({
                steam_appid: game.appid,
                name: game.name,
            }));
            const { error } = yield client_1.supabase
                .from('games')
                .upsert(gamesToInsert, { onConflict: 'steam_appid' });
            if (error) {
                console.error(`Error adding new games to Supabase:`, error);
            }
            else {
                console.log(`--- Batch of ${batch.length} processed. ---`);
            }
            yield new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
        }
    });
}
function updateTotalGamesStat(totalCount) {
    return __awaiter(this, void 0, void 0, function* () {
        const KEY = 'totalGames';
        try {
            console.log(`Updating total games count to: ${totalCount}`);
            const { error } = yield client_1.supabase
                .from('statistics')
                .update({ count: totalCount })
                .eq('key', KEY);
            if (error) {
                console.error('Failed to update total games stat:', error);
            }
            else {
                console.log('Successfully updated total games stat.');
            }
        }
        catch (error) {
            console.error('Failed to update total games stat:', error);
        }
    });
}
function runSyncService() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Starting Steam AppID sync service...');
            // 1. Fetch all games from Steam API
            console.log('Fetching all games from Steam...');
            const allSteamGames = yield fetchSteamGames();
            if (allSteamGames.length === 0) {
                console.error('Steam games list is empty. Aborting sync.');
                return;
            }
            console.log(`Found ${allSteamGames.length} total games on Steam.`);
            // 2. Fetch all existing game IDs from Supabase
            console.log('Fetching existing game IDs from database...');
            const existingGameIds = yield getExistingGameIds();
            console.log(`Found ${existingGameIds.size} existing games in the database.`);
            // 3. Determine which games are new
            const newGames = allSteamGames.filter(game => !existingGameIds.has(game.appid));
            console.log(`Found ${newGames.length} new games to add.`);
            if (newGames.length > 0) {
                // 4. Add new games to Supabase
                yield addNewGames(newGames);
                // 5. After syncing, update the total games count to the new total in the database
                const newTotalCount = existingGameIds.size + newGames.length;
                yield updateTotalGamesStat(newTotalCount);
            }
            console.log('Steam sync completed successfully.');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred';
            console.error('A critical error occurred in the sync service:', message);
            process.exit(1);
        }
    });
}
// Autorun the service when the script is executed
if (require.main === module) {
    void runSyncService();
}
