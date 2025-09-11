"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables from the root .env file
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../.env') });
const config = {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 6543,
    steamApiKey: process.env.STEAM_API_KEY || process.env.STEAM_API_KEY_0,
    steamApiKeys: [
        process.env.STEAM_API_KEY_0,
        process.env.STEAM_API_KEY_1,
    ],
    appwrite: {
        endpoint: process.env.APPWRITE_ENDPOINT,
        projectId: process.env.APPWRITE_PROJECT_ID,
        apiKey: process.env.APPWRITE_API_KEY,
        databaseId: process.env.APPWRITE_DATABASE_ID,
        gamesCollectionId: process.env.APPWRITE_GAMES_COLLECTION_ID,
    },
    worker: {
        id: process.env.WORKER_ID ? parseInt(process.env.WORKER_ID, 10) : 0,
        total: process.env.TOTAL_WORKERS ? parseInt(process.env.TOTAL_WORKERS, 10) : 1,
    },
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_KEY,
};
exports.default = config;
