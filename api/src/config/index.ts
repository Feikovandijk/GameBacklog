import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// --- DEBUG: Check if .env variables are loaded ---
console.log('SUPABASE_URL is defined:', !!process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_KEY is defined:', !!process.env.SUPABASE_SERVICE_KEY);
// --- END DEBUG ---

interface Config {
  port: number;
  steamApiKey: string | undefined;
  steamApiKeys: (string | undefined)[];
  appwrite: {
    endpoint: string | undefined;
    projectId: string | undefined;
    apiKey: string | undefined;
    databaseId: string | undefined;
    gamesCollectionId: string | undefined;
  };
  worker: {
    id: number;
    total: number;
  };
  supabaseUrl: string | undefined;
  supabaseAnonKey: string | undefined;
  supabaseServiceRoleKey: string | undefined;
  neo4jUri: string | undefined;
  neo4jUser: string | undefined;
  neo4jPassword: string | undefined;
}

const config: Config = {
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
  neo4jUri: process.env.NEO4J_URI,
  neo4jUser: process.env.NEO4J_USER,
  neo4jPassword: process.env.NEO4J_PASSWORD,
};

export default config; 