import SteamUser from 'steam-user';
import config from '../config';
import { supabase } from '../supabase/client';
import { GameDocument, WebApiData } from '../types/steam.types';

const steamUser = new SteamUser();
steamUser.setOptions({
  enablePicsCache: true, // Required for getProductInfo
  changelistUpdateInterval: 0, // We don't need automatic updates
});

const STEAM_API_KEY =
  config.steamApiKeys[config.worker.id] || config.steamApiKey;

if (!STEAM_API_KEY) {
  throw new Error(
    `[Worker ${config.worker.id}] Steam API key is missing. Ensure STEAM_API_KEY_${config.worker.id} or a fallback STEAM_API_KEY is defined in your .env file.`
  );
}

const STEAM_API_BASE_URL = 'https://store.steampowered.com/api/appdetails';
const REVIEW_API_BASE_URL = 'https://store.steampowered.com/appreviews';
const UPDATE_INTERVAL_DAYS = 7;
const GAMES_PER_MINUTE_LIMIT = 30; // Stay under the 100k/day Steam API limit
const DELAY_MS = 60000 / GAMES_PER_MINUTE_LIMIT;

async function fetchWithRetry(
  url: string,
  retries: number = 3,
  backoff: number = 1000
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response;
      }
      // Don't retry on client errors (4xx) or server errors that are not rate-limiting (e.g. 500)
      if (response.status >= 400 && response.status < 500) {
        console.warn(
          `Request to ${sanitizeUrl(url)} failed with status ${response.status}. Not retrying.`
        );
        return response; // Return the failed response to be handled by the caller
      }
      console.warn(
        `Request to ${sanitizeUrl(url)} failed with status ${response.status}. Retrying in ${backoff / 1000}s...`
      );
    } catch (error: any) {
      console.warn(
        `Request to ${sanitizeUrl(url)} failed with error: ${error.message}. Retrying in ${backoff / 1000}s...`
      );
    }
    await new Promise(resolve => setTimeout(resolve, backoff));
    backoff *= 2; // Exponential backoff
  }
  throw new Error(
    `Failed to fetch from ${sanitizeUrl(url)} after ${retries} attempts.`
  );
}

/**
 * Redact sensitive information (such as API keys) from a string representation
 * of a URL or error message before logging.
 */
function redactSecrets(input: string): string {
  let result = input;

  // Redact explicit Steam API key value if it is present in the string.
  if (STEAM_API_KEY) {
    // Escape special regex characters in the key
    const escapedKey = STEAM_API_KEY.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const keyRegex = new RegExp(escapedKey, 'g');
    result = result.replace(keyRegex, '***');
  }

  // Fallback: redact common API key patterns even if the exact value is unknown.
  // Example patterns:
  //   ?key=SECRET
  //   &api_key=SECRET
  //   /key/SECRET
  result = result.replace(/([?&](?:key|api_key|apikey)=)[^&#]*/gi, '$1***');
  result = result.replace(/(\/(?:key|api_key|apikey)\/)[^/?#]*/gi, '$1***');

  return result;
}

function sanitizeUrl(urlStr: string): string {
  try {
    const url = new URL(urlStr);

    // Remove or mask any query parameters that might contain API keys.
    const sensitiveParamNames = ['key', 'api_key', 'apikey'];
    for (const name of sensitiveParamNames) {
      if (url.searchParams.has(name)) {
        url.searchParams.set(name, '***');
      }
    }

    // Also defensively redact any occurrence of the raw key in the final string.
    return redactSecrets(url.toString());
  } catch {
    // Fallback: redact common API key patterns even if URL parsing fails
    return redactSecrets(urlStr);
  }
}

export async function fetchGameDetailsFromSteam(
  steamAppId: number
): Promise<WebApiData | null> {
  const appDetailsUrl = `${STEAM_API_BASE_URL}?appids=${steamAppId}&key=${STEAM_API_KEY}`;
  const reviewUrl = `${REVIEW_API_BASE_URL}/${steamAppId}?json=1&purchase_type=all`;

  try {
    const [appDetailsResponse, reviewResponse] = await Promise.all([
      fetchWithRetry(appDetailsUrl),
      fetchWithRetry(reviewUrl),
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
    const details = appDetailsData[steamAppId];

    if (!details || !details.success) {
      console.warn(
        `Steam indicated unsuccessful fetch for appid ${steamAppId}.`
      );
      return null;
    }

    const gameData: WebApiData = details.data;

    if (gameData.type && gameData.type !== 'game') {
      console.log(
        `AppID ${steamAppId} is a '${gameData.type}', not a game. Skipping full data processing.`
      );
      return null;
    }

    if (reviewResponse.ok) {
      const reviewJson = await reviewResponse.json();
      if (reviewJson.success) {
        gameData.review_summary = reviewJson.query_summary;
      }
    }

    return gameData;
  } catch (error) {
    console.error(
      `Error fetching game details for appid ${steamAppId} from Steam:`,
      error
    );
    return null;
  }
}

async function recordReviewHistory(gameId: string, totalReviews: number) {
  if (typeof totalReviews !== 'number') {
    return; // Don't record if no review data
  }

  const historyData = {
    game_id: gameId,
    date: new Date().toISOString(),
    total_reviews: totalReviews,
  };

  try {
    const { error } = await supabase.from('review_history').insert(historyData);

    if (error) {
      console.error(
        `Error recording review history for game ${gameId}:`,
        error
      );
    } else {
      console.log(`Successfully recorded review history for game ${gameId}.`);
    }
  } catch (error) {
    console.error(`Error recording review history for game ${gameId}:`, error);
  }
}

export async function updateGameInSupabase(
  gameId: string,
  steamData: WebApiData | null,
  options: { deepSync?: boolean } = { deepSync: true }
) {
  if (steamData) {
    // This is a valid game, do a full update
    const isEarlyAccess =
      steamData.genres?.some(genre => genre.description === 'Early Access') ??
      false;

    let releaseDateForDb: string | undefined;
    const steamReleaseDate = steamData.release_date;

    if (
      steamReleaseDate &&
      !steamReleaseDate.coming_soon &&
      steamReleaseDate.date
    ) {
      const parsedDate = new Date(steamReleaseDate.date);
      if (!isNaN(parsedDate.getTime())) {
        releaseDateForDb = parsedDate.toISOString();
      } else {
        console.warn(
          `Could not parse '${steamReleaseDate.date}' as a date for game '${steamData.name}'. Release date will be left unchanged.`
        );
      }
    } else if (steamReleaseDate?.coming_soon) {
      console.log(
        `'${steamData.name}' is marked as 'coming soon', release date will not be set.`
      );
    }

    const price = steamData.price_overview;
    const reviews = steamData.review_summary;
    const categories = steamData.categories?.map(c => c.description) ?? [];
    const hasSteamAchievements = categories.includes('Steam Achievements');
    const genres = steamData.genres
      ? steamData.genres.map(g => g.description)
      : null;

    const gameData: Partial<GameDocument> = {
      name: steamData.name,
      short_description: steamData.short_description,
      detailed_description: steamData.detailed_description ?? null,
      about_the_game: steamData.about_the_game ?? null,
      header_image: steamData.header_image,
      website: steamData.website ?? null,
      screenshots: steamData.screenshots
        ? steamData.screenshots.map(s => s.path_full)
        : null,
      movies: steamData.movies
        ? steamData.movies
            .map(m => m.mp4?.max)
            .filter((url): url is string => !!url)
        : null,
      release_date: releaseDateForDb ?? null,
      last_updated: new Date().toISOString(),
      developers: steamData.developers,
      publishers: steamData.publishers,
      is_early_access: isEarlyAccess,
      is_free: steamData.is_free ?? false,
      total_reviews: reviews?.total_reviews ?? null,
      steam_app_type: 'game',
      price_final: price?.final ?? null,
      price_currency: price?.currency ?? null,
      price_initial: price?.initial ?? null,
      discount_percent: price?.discount_percent ?? null,
      total_positive: reviews?.total_positive ?? null,
      total_negative: reviews?.total_negative ?? null,
      positive_rating_percentage:
        reviews?.total_reviews && reviews?.total_reviews > 0
          ? Math.round((reviews.total_positive / reviews.total_reviews) * 100)
          : null,
      review_score_desc: reviews?.review_score_desc ?? null,
      genres: genres,
      metacritic_score: steamData.metacritic?.score ?? null,
      metacritic_url: steamData.metacritic?.url ?? null,
      platforms_windows: steamData.platforms?.windows ?? null,
      platforms_mac: steamData.platforms?.mac ?? null,
      platforms_linux: steamData.platforms?.linux ?? null,
      pc_requirements: steamData.pc_requirements ?? null,
      mac_requirements: steamData.mac_requirements ?? null,
      linux_requirements: steamData.linux_requirements ?? null,
      supported_languages: steamData.supported_languages ?? null,
      dlc: steamData.dlc ?? null,
      required_age: steamData.required_age ?? null,
      categories: categories.length > 0 ? categories : null,
      has_steam_achievements: hasSteamAchievements,
    };

    try {
      const { error } = await supabase
        .from('games')
        .update(gameData)
        .eq('id', gameId);

      if (error) {
        console.error(
          `Error updating game ${steamData.name} in Supabase:`,
          error
        );
        return false;
      }

      console.log(`Successfully updated game ${steamData.name}`);

      if (options.deepSync && hasSteamAchievements) {
        console.log(`Game ${steamData.name} has achievements. Syncing...`);
        await syncGameAchievements(gameId, steamData.steam_appid);
      }

      if (options.deepSync && reviews?.total_reviews) {
        await recordReviewHistory(gameId, Number(reviews.total_reviews));
      }

      return true;
    } catch (error) {
      console.error(
        `Error updating game ${steamData.name} in Supabase:`,
        error
      );
      return false;
    }
  } else {
    const gameData: Partial<GameDocument> = {
      last_updated: new Date().toISOString(),
      steam_app_type: 'invalid',
    };
    try {
      const { error } = await supabase
        .from('games')
        .update(gameData)
        .eq('id', gameId);

      if (error) {
        console.error(`Error marking game ${gameId} as 'invalid':`, error);
        return false;
      }

      console.log(
        `Marked game ${gameId} as type 'invalid'. It will be skipped in future updates.`
      );
      return false;
    } catch (error) {
      console.error(`Error marking game ${gameId} as 'invalid':`, error);
      return false;
    }
  }
}

async function runRefreshService() {
  console.log(
    'Local Steam refresh service started. It will run continuously until all games are updated.'
  );
  let totalUpdatedCount = 0;

  try {
    const { count, error: countError } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true });
    if (countError) {
      console.error('Error counting games in database:', countError);
      throw new Error('Could not count games in database.');
    }

    if (count === 0) {
      console.log(
        "\nThe 'games' table is empty. This script is for refreshing existing game data."
      );
      console.log(
        "--> Please run the 'steam-sync-service.ts' script first to populate your database with all games from Steam."
      );
      return; // Exit gracefully
    }

    console.log('Logging into Steam anonymously...');
    steamUser.logOn({ anonymous: true });

    await new Promise<void>((resolve, reject) => {
      steamUser.on('loggedOn', () => {
        console.log(
          `[Worker ${config.worker.id}/${config.worker.total}] Logged into Steam successfully.`
        );
        resolve();
      });
      steamUser.on('error', err => {
        console.error(
          `[Worker ${config.worker.id}/${config.worker.total}] Steam login error:`,
          err
        );
        reject(err);
      });
    });

    const BATCH_SIZE = 250;
    let currentOffset = config.worker.id * BATCH_SIZE;

    while (true) {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - UPDATE_INTERVAL_DAYS);

      console.log(`
[Worker ${config.worker.id}/${config.worker.total}] Fetching batch of games starting from offset ${currentOffset}...`);

      const { data: neverUpdatedData, error: neverUpdatedError } =
        await supabase
          .from('games')
          .select('*')
          .is('last_updated', null)
          .order('steam_appid', { ascending: false })
          .range(currentOffset, currentOffset + BATCH_SIZE - 1);

      if (neverUpdatedError) {
        console.error('Error fetching never updated games:', neverUpdatedError);
      }

      const { data: oldGamesData, error: oldGamesError } = await supabase
        .from('games')
        .select('*')
        .lt('last_updated', thresholdDate.toISOString())
        .eq('steam_app_type', 'game')
        .order('steam_appid', { ascending: false })
        .range(currentOffset, currentOffset + BATCH_SIZE - 1);

      if (oldGamesError) {
        console.error('Error fetching old games:', oldGamesError);
      }

      const allStaleGames = [
        ...(neverUpdatedData || []),
        ...(oldGamesData || []),
      ];
      const staleGamesMap = new Map();
      allStaleGames.forEach(game => staleGamesMap.set(game.id, game));

      const staleGames = Array.from(staleGamesMap.values())
        .sort((a, b) => (b.steam_appid || 0) - (a.steam_appid || 0))
        .slice(0, BATCH_SIZE);

      if (staleGames.length === 0) {
        console.log(
          `[Worker ${config.worker.id}/${config.worker.total}] No more stale games found at this offset. Worker will exit.`
        );
        break;
      }

      console.log(
        `[Worker ${config.worker.id}/${config.worker.total}] Found ${staleGames.length} games. Starting batch processing...`
      );

      for (const [index, game] of staleGames.entries()) {
        if (!game.steam_appid) {
          console.warn(
            `[Worker ${config.worker.id}/${config.worker.total}] Game ${game.id} has no steam_appid, skipping.`
          );
          continue;
        }

        console.log(
          `[Worker ${config.worker.id}/${config.worker.total}] Processing game: ${game.name} (Steam AppID: ${game.steam_appid})`
        );
        const steamData = await fetchGameDetailsFromSteam(
          Number(game.steam_appid)
        );

        const success = await updateGameInSupabase(String(game.id), steamData);
        if (success) {
          totalUpdatedCount++;
          await incrementStat('updatedGames');
        }

        if (index < staleGames.length - 1) {
          console.log(
            `[Worker ${config.worker.id}/${config.worker.total}] Waiting for ${DELAY_MS / 1000} seconds before next Steam API call...`
          );
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
      }

      console.log(
        `[Worker ${config.worker.id}/${config.worker.total}] Batch finished. Total updated by this worker: ${totalUpdatedCount}.`
      );

      currentOffset += config.worker.total * BATCH_SIZE;
    }

    console.log(`
[Worker ${config.worker.id}/${config.worker.total}] Steam refresh completed.`);
    steamUser.logOff();
  } catch (e) {
    const error = e as Error;
    console.error(
      `[Worker ${config.worker.id}/${config.worker.total}] Error in Steam refresh service:`,
      error.message
    );
    steamUser.logOff();
    process.exit(1);
  }
}

async function incrementStat(key: string, incrementBy: number = 1) {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('statistics')
      .select('*')
      .eq('key', key)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "not found"
      console.error(`Error fetching stat for key ${key}:`, fetchError);
      return;
    }

    if (existing) {
      const newCount = (existing.count || 0) + incrementBy;
      const { error: updateError } = await supabase
        .from('statistics')
        .update({ count: newCount })
        .eq('key', key);

      if (updateError) {
        console.error(`Error updating stat for key ${key}:`, updateError);
      }
    }
  } catch (e) {
    console.error(`
Failed to increment stat for key: ${key}. Error: ${String(e)}`);
  }
}

interface Achievement {
  name: string; // This is the API name
  displayName: string;
  description: string;
  hidden: boolean;
  icon: string;
  icongray: string;
  percent?: number; // from the global stats endpoint
}

interface AchievementDocument {
  game_id: string; // FK to games collection document $id
  steam_appid: number;
  name: string; // API name (required by DB)
  achievement_id: string; // This is the API name (required by DB)
  api_name: string; // We added this, keeping it for consistency or future use
  display_name: string;
  description?: string | null;
  icon?: string | null;
  icon_gray?: string | null;
  hidden?: boolean | null;
  global_percentage?: number | null;
}

async function syncGameAchievements(documentId: string, steamAppId: number) {
  const schemaUrl = `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${STEAM_API_KEY}&appid=${steamAppId}&l=english`;
  const percentagesUrl = `https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid=${steamAppId}`;

  try {
    const [schemaResponse, percentagesResponse] = await Promise.all([
      fetchWithRetry(schemaUrl),
      fetchWithRetry(percentagesUrl),
    ]);

    if (!schemaResponse.ok) {
      console.warn(
        `Could not fetch achievement schema for appid ${steamAppId}. Status: ${schemaResponse.status}`
      );
      return;
    }

    const schemaData = await schemaResponse.json();
    const achievements: Achievement[] =
      schemaData.game?.availableGameStats?.achievements ?? [];

    if (achievements.length === 0) {
      console.log(`No achievements found for appid ${steamAppId}.`);
      return;
    }

    const percentagesData: any = {};
    if (percentagesResponse.ok) {
      const percentagesJson = await percentagesResponse.json();
      if (percentagesJson?.achievementpercentages?.achievements) {
        percentagesJson.achievementpercentages.achievements.forEach(
          (ach: { name: string; percent: any }) => {
            const percentValue = parseFloat(String(ach.percent));
            if (!isNaN(percentValue)) {
              percentagesData[ach.name] = percentValue;
            } else {
              console.warn(
                `Could not parse achievement percent for ${ach.name} as a float. Value was: ${ach.percent}`
              );
            }
          }
        );
      }
    } else {
      console.warn(
        `Could not fetch achievement percentages for appid ${steamAppId}.`
      );
    }

    const achievementsToCreate: AchievementDocument[] = achievements.map(
      ach => ({
        game_id: documentId,
        steam_appid: steamAppId,
        name: String(ach.name), // Map API name to name
        achievement_id: String(ach.name), // Map API name to achievement_id
        api_name: String(ach.name),
        display_name: String(ach.displayName),
        description: ach.description ? String(ach.description) : null,
        icon: ach.icon ? String(ach.icon) : null,
        icon_gray: ach.icongray ? String(ach.icongray) : null,
        hidden: !!ach.hidden,
        global_percentage: percentagesData[ach.name] ?? null,
      })
    );

    // Delete all old achievements for the game to ensure data is fresh
    const { error: deleteError } = await supabase
      .from('achievements')
      .delete()
      .eq('steam_appid', steamAppId);

    if (deleteError) {
      console.error(
        `Error deleting old achievements for appid ${steamAppId}:`,
        deleteError
      );
    } else {
      console.log(`Deleted old achievements for appid ${steamAppId}.`);
    }

    // Create new ones in batches
    const BATCH_SIZE = 50;
    for (let i = 0; i < achievementsToCreate.length; i += BATCH_SIZE) {
      const batch = achievementsToCreate.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase
        .from('achievements')
        .insert(batch);

      if (insertError) {
        console.error(
          `Error inserting achievement batch for appid ${steamAppId}:`,
          insertError
        );
      }
    }

    console.log(
      `Successfully synced ${achievementsToCreate.length} achievements for appid ${steamAppId}.`
    );
  } catch (error) {
    console.error(`Error syncing achievements for appid ${steamAppId}:`, error);
  }
}

// Autorun the service when the script is executed
if (require.main === module) {
  void runRefreshService();
}

export { runRefreshService }; // Export if you plan to import it elsewhere
