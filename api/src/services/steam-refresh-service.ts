import { createClient, SupabaseClient } from '@supabase/supabase-js';
import config from '../config';

const STEAM_API_KEY = config.steamApiKey!;
const SUPABASE_URL = config.supabaseUrl!;
const SUPABASE_SERVICE_ROLE_KEY = config.supabaseServiceRoleKey!;

// Initialize Supabase client with service role
const supabaseAdmin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const STEAM_API_BASE_URL = "https://store.steampowered.com/api/appdetails";
const REVIEW_API_BASE_URL = "https://store.steampowered.com/appreviews";
const UPDATE_INTERVAL_DAYS = 7;
const GAMES_PER_MINUTE_LIMIT = 60; // Adjusted to be safer, ~1 game per second
const DELAY_MS = 60000 / GAMES_PER_MINUTE_LIMIT; // Calculate delay in milliseconds

interface Game {
  game_id: number;
  steam_appid: number;
  name: string;
  short_description?: string;
  header_image?: string;
  release_date?: string; 
  last_updated: string;
  developers?: string[];
  publishers?: string[];
  is_early_access?: boolean;
  total_reviews?: number;
}

async function fetchGameDetailsFromSteam(steamAppId: number): Promise<any | null> {
  const appDetailsUrl = `${STEAM_API_BASE_URL}?appids=${steamAppId}&key=${STEAM_API_KEY}`;
  const reviewUrl = `${REVIEW_API_BASE_URL}/${steamAppId}?json=1&purchase_type=all`;

  console.log(`Fetching app details from: ${appDetailsUrl.replace(STEAM_API_KEY, 'YOUR_STEAM_KEY')}`);
  console.log(`Fetching reviews from: ${reviewUrl}`);

  try {
    const [appDetailsResponse, reviewResponse] = await Promise.all([
      fetch(appDetailsUrl),
      fetch(reviewUrl)
    ]);

    if (!appDetailsResponse.ok) {
      console.error(
        `Steam API request failed for appid ${steamAppId}: ${appDetailsResponse.status} ${appDetailsResponse.statusText}`
      );
      const errorBody = await appDetailsResponse.text();
      console.error(`Steam API Error Body: ${errorBody}`);
      return null;
    }
    
    const appDetailsData = await appDetailsResponse.json();
    let reviewData = null;

    if (reviewResponse.ok) {
        const reviewJson = await reviewResponse.json();
        if (reviewJson.success) {
            reviewData = reviewJson.query_summary;
        } else {
            console.warn(`Could not fetch review data for appid ${steamAppId}.`);
        }
    } else {
        console.warn(`Review API request failed for appid ${steamAppId}: ${reviewResponse.status} ${reviewResponse.statusText}`);
    }

    if (appDetailsData && appDetailsData[steamAppId] && appDetailsData[steamAppId].success) {
      const gameData = appDetailsData[steamAppId].data;
      if (reviewData) {
        gameData.recommendations = { total: reviewData.total_reviews };
      }
      return gameData;
    }

    console.warn(
      `No data or unsuccessful response for appid ${steamAppId} from Steam. Response: ${JSON.stringify(
        appDetailsData
      )}`
    );
    return null;
  } catch (error) {
    console.error(
      `Error fetching game details for appid ${steamAppId} from Steam:`, error
    );
    return null;
  }
}

async function updateGameInSupabase(game: Game, steamData: any) {
  const isEarlyAccess = steamData.genres?.some(
    (genre: { id: string; description: string }) => genre.description === "Early Access"
  ) ?? false;

  const updatedGameData: Partial<Game> = {
    name: steamData.name || game.name,
    short_description: steamData.short_description,
    header_image: steamData.header_image,
    release_date: steamData.release_date?.date || game.release_date, // Steam often has { date: "YYYY-MM-DD" }
    last_updated: new Date().toISOString(),
    developers: steamData.developers,
    publishers: steamData.publishers,
    is_early_access: isEarlyAccess,
    total_reviews: steamData.recommendations?.total,
  };

  console.log("Data being sent to Supabase:", JSON.stringify(updatedGameData, null, 2));

  const { error } = await supabaseAdmin
    .from('games')
    .update(updatedGameData)
    .eq('game_id', game.game_id);

  if (error) {
    console.error(
      `Error updating game ${game.game_id} (${game.name}) in Supabase:`, error
    );
  } else {
    console.log(`Successfully updated game ${game.game_id} (${game.name})`);
  }
}

async function runRefreshService() {
  console.log("Local Steam refresh service started.");

  try {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - UPDATE_INTERVAL_DAYS);

    const { data: staleGames, error: fetchError } = await supabaseAdmin
      .from('games')
      .select('game_id, steam_appid, name, last_updated, short_description, header_image, release_date, developers, publishers, is_early_access, total_reviews')
      .or(`last_updated.is.null,last_updated.lt.${thresholdDate.toISOString()}`);

    if (fetchError) {
      console.error("Error fetching stale games:", fetchError);
      throw new Error(`Failed to fetch stale games: ${fetchError.message}`);
    }

    if (!staleGames || staleGames.length === 0) {
      console.log("No stale games to update.");
      return;
    }

    console.log(`Found ${staleGames.length} stale games to update.`);

    let updatedCount = 0;
    for (const [index, game] of (staleGames as Game[]).entries()) {
      if (!game.steam_appid) {
        console.warn(
          `Game ${game.game_id} (${game.name}) has no steam_appid, skipping.`
        );
        continue;
      }

      console.log(
        `Processing game: ${game.name} (ID: ${game.game_id}, Steam AppID: ${game.steam_appid})`
      );
      const steamData = await fetchGameDetailsFromSteam(game.steam_appid);

      if (steamData) {
        await updateGameInSupabase(game, steamData);
        updatedCount++;
      }

      if (index < staleGames.length - 1) {
        console.log(
          `Waiting for ${DELAY_MS / 1000} seconds before next Steam API call...`
        );
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    console.log(
      `Steam refresh completed. Updated ${updatedCount} of ${staleGames.length} games.`
    );

  } catch (e: any) {
    console.error("Error in Steam refresh service:", e);
    process.exit(1); // Exit with error for schedulers to pick up failure
  }
}

// Autorun the service when the script is executed
if (require.main === module) {
    runRefreshService();
}

export { runRefreshService }; // Export if you plan to import it elsewhere
