import dotenv from 'dotenv';
import path from 'path';

// Load .env file from the root of the project
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const config = {
  port: process.env.PORT || '3000',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  steamApiKey: process.env.STEAM_API_KEY,
};

// Validate that all necessary environment variables are set
if (!config.supabaseUrl || !config.supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing. Please check your .env file.');
  process.exit(1);
}

if (!config.supabaseServiceRoleKey) {
    console.warn('Supabase Service Role Key is missing. The refresh service will not work.');
}

if (!config.steamApiKey) {
    console.warn('Steam API Key is missing. The refresh service will not work.');
}

export default config; 