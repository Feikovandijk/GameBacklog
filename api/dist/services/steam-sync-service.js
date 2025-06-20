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
// Fetches the full list of all Steam games
function fetchSteamGames() {
    return __awaiter(this, void 0, void 0, function* () {
        const url = "https://api.steampowered.com/ISteamApps/GetAppList/v2/";
        try {
            const response = yield fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = yield response.json();
            return data.applist.apps;
        }
        catch (error) {
            console.error("Failed to fetch Steam games list:", error);
            return []; // Return empty array on failure
        }
    });
}
// Fetches all game IDs currently in the Appwrite database
function getExistingGameIds() {
    return __awaiter(this, void 0, void 0, function* () {
        const existingIds = new Set();
        let hasMore = true;
        let lastId = undefined;
        while (hasMore) {
            const queries = [node_appwrite_1.Query.limit(100)];
            if (lastId) {
                queries.push(node_appwrite_1.Query.cursorAfter(lastId));
            }
            try {
                const response = yield databases.listDocuments(config_1.default.appwrite.databaseId, config_1.default.appwrite.gamesCollectionId, queries);
                if (response.documents.length > 0) {
                    response.documents.forEach(doc => {
                        if (doc.steam_appid) {
                            existingIds.add(doc.steam_appid);
                        }
                    });
                    lastId = response.documents[response.documents.length - 1].$id;
                }
                else {
                    hasMore = false;
                }
            }
            catch (error) {
                console.error('Error fetching existing game IDs from Appwrite:', error);
                hasMore = false; // Stop on error
            }
        }
        return existingIds;
    });
}
// Adds new games to the Appwrite database in batches
function addNewGames(newGames) {
    return __awaiter(this, void 0, void 0, function* () {
        const BATCH_SIZE = 100; // Appwrite recommends batches of 100
        for (let i = 0; i < newGames.length; i += BATCH_SIZE) {
            const batch = newGames.slice(i, i + BATCH_SIZE);
            console.log(`Processing batch ${i / BATCH_SIZE + 1} of ${Math.ceil(newGames.length / BATCH_SIZE)}...`);
            const promises = batch.map(game => {
                return databases.createDocument(config_1.default.appwrite.databaseId, config_1.default.appwrite.gamesCollectionId, node_appwrite_1.ID.unique(), {
                    steam_appid: game.appid,
                    name: game.name,
                }).catch(error => {
                    // Log specific errors but don't stop the whole batch
                    if (error instanceof node_appwrite_1.AppwriteException && error.code === 409) { // 409: Conflict (likely unique index)
                        console.warn(`Game with appid ${game.appid} might already exist (unique constraint failed). Skipping.`);
                    }
                    else {
                        console.error(`Error adding game ${game.name} (appid: ${game.appid}):`, error);
                    }
                });
            });
            yield Promise.all(promises);
            console.log(`Batch finished. Waiting 1 second...`);
            yield new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
        }
    });
}
function runSyncService() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("Starting Steam AppID sync service...");
            // 1. Fetch all games from Steam API
            console.log("Fetching all games from Steam...");
            const allSteamGames = yield fetchSteamGames();
            if (allSteamGames.length === 0) {
                console.error("Steam games list is empty. Aborting sync.");
                return;
            }
            console.log(`Found ${allSteamGames.length} total games on Steam.`);
            // 2. Fetch all existing game IDs from Appwrite
            console.log("Fetching existing game IDs from database...");
            const existingGameIds = yield getExistingGameIds();
            console.log(`Found ${existingGameIds.size} existing games in the database.`);
            // 3. Determine which games are new
            const newGames = allSteamGames.filter(game => !existingGameIds.has(game.appid));
            console.log(`Found ${newGames.length} new games to add.`);
            if (newGames.length > 0) {
                // 4. Add new games to Appwrite
                yield addNewGames(newGames);
            }
            console.log("Steam sync completed successfully.");
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred';
            console.error("A critical error occurred in the sync service:", message);
            process.exit(1);
        }
    });
}
// Autorun the service when the script is executed
if (require.main === module) {
    runSyncService();
}
