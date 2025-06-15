import { createClient, SupabaseClient } from '@supabase/supabase-js';
import config from '../config';

const SUPABASE_URL = config.supabaseUrl!;
const SUPABASE_SERVICE_ROLE_KEY = config.supabaseServiceRoleKey!;

// Initialize Supabase client with service role
const supabaseAdmin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const STEAM_API_GET_APP_LIST_URL = "https://api.steampowered.com/ISteamApps/GetAppList/v2/";
const GAMES_PER_MINUTE_LIMIT = 50;
const DELAY_MS = 60000 / GAMES_PER_MINUTE_LIMIT;

interface SteamApp {
  appid: number;
  name: string;
}

async function fetchAllSteamApps(): Promise<SteamApp[]> {
  try {
    console.log("Fetching all Steam apps...");
    const response = await fetch(STEAM_API_GET_APP_LIST_URL);
    if (!response.ok) {
      console.error(`Steam API request failed: ${response.status} ${response.statusText}`);
      return [];
    }
    const data = await response.json();
    if (data.applist && data.applist.apps) {
      console.log(`Successfully fetched ${data.applist.apps.length} apps from Steam.`);
      return data.applist.apps;
    }
    return [];
  } catch (error) {
    console.error("Error fetching all Steam apps:", error);
    return [];
  }
}

async function getExistingSteamAppIds(): Promise<number[]> {
    const { data, error } = await supabaseAdmin
        .from('games')
        .select('steam_appid');

    if (error) {
        console.error("Error fetching existing steam_appids:", error);
        return [];
    }
    return data.map(game => game.steam_appid).filter(id => id != null);
}


async function runSyncService() {
  console.log("Local Steam sync service started.");
  try {
    const allSteamApps = await fetchAllSteamApps();
    if (!allSteamApps || allSteamApps.length === 0) {
      console.log("No apps fetched from Steam. Exiting.");
      return;
    }

    const existingAppIds = await getExistingSteamAppIds();
    console.log(`Found ${existingAppIds.length} existing games in the database.`);
    
    const newApps = allSteamApps.filter(app => !existingAppIds.includes(app.appid) && app.name.trim() !== '');

    if (newApps.length === 0) {
        console.log("No new games to add. Database is up-to-date.");
        return;
    }

    console.log(`Found ${newApps.length} new games to sync.`);

    let syncedCount = 0;
    for (const [index, app] of newApps.entries()) {
      console.log(`[${index + 1}/${newApps.length}] Syncing game: ${app.name} (Steam AppID: ${app.appid})`);

      const { error } = await supabaseAdmin
        .from('games')
        .insert({ steam_appid: app.appid, name: app.name });

      if (error) {
        if (error.code === '23505') { // unique_violation
            console.warn(`Game with steam_appid ${app.appid} already exists. Skipping.`);
        } else {
            console.error(`Error inserting game ${app.name} (ID: ${app.appid}):`, error);
        }
      } else {
        syncedCount++;
        console.log(`Successfully inserted ${app.name}`);
      }
      
      if (index < newApps.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    console.log(`Steam sync completed. Synced ${syncedCount} new games.`);

  } catch (e: any) {
    console.error("Error in Steam sync service:", e);
    process.exit(1);
  }
}

if (require.main === module) {
    runSyncService();
} 