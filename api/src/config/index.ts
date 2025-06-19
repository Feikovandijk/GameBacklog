import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

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
  // supabaseUrl: string | undefined;
  // supabaseAnonKey: string | undefined;
  // supabaseServiceRoleKey: string | undefined;
}

const config: Config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 8080,
  steamApiKey: process.env.STEAM_API_KEY,
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
  // supabaseUrl: process.env.SUPABASE_URL,
  // supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  // supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

export default config; 