import SteamUser from 'steam-user';
import config from '../config';
import { supabase } from '../supabase/client';

const steamUser = new SteamUser();
steamUser.setOptions({
  changelistUpdateInterval: 0,
});

const STEAM_API_KEY =
  config.steamApiKeys[config.worker.id] || config.steamApiKey;

if (!STEAM_API_KEY) {
  throw new Error(
    `[Worker ${config.worker.id}] Steam API key is missing. Ensure STEAM_API_KEY_${config.worker.id} or a fallback STEAM_API_KEY is defined in your .env file.`
  );
}

const GAMES_PER_MINUTE_LIMIT = 60; // Reduced to avoid 404s and rate limits
const DELAY_MS = 60000 / GAMES_PER_MINUTE_LIMIT;
const UPDATE_INTERVAL_HOURS = 24; // For development

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
      if (response.status === 404) {
        console.info(
          `Request to ${url} returned 404 (Not Found). This is expected for some AppIDs.`
        );
        return response;
      }
      if (response.status >= 400 && response.status < 500) {
        console.warn(
          `Request to ${url} failed with status ${response.status}. Not retrying.`
        );
        return response;
      }
      console.warn(
        `Request to ${url} failed with status ${response.status}. Retrying in ${backoff / 1000}s...`
      );
    } catch (error: any) {
      console.warn(
        `Request to ${url} failed with error: ${error.message}. Retrying in ${backoff / 1000}s...`
      );
    }
    await new Promise(resolve => setTimeout(resolve, backoff));
    backoff *= 2;
  }
  throw new Error(`Failed to fetch from ${url} after ${retries} attempts.`);
}

async function getPlayerCount(steamAppId: number): Promise<number | null> {
  const playersUrl = `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${steamAppId}`;
  try {
    const playersResponse = await fetchWithRetry(playersUrl);
    if (playersResponse.ok) {
      const playersJson = await playersResponse.json();
      if (playersJson.response?.result === 1) {
        return playersJson.response.player_count;
      }
    }
    return null;
  } catch (error) {
    console.error(
      `Error fetching player count for appid ${steamAppId}:`,
      error
    );
    return null;
  }
}

async function recordPlayerCountHistory(gameId: string, playerCount: number) {
  if (typeof playerCount !== 'number') {
    return;
  }

  const historyData = {
    game_id: gameId,
    date: new Date().toISOString(),
    player_count: playerCount,
  };

  try {
    const { error } = await supabase
      .from('player_count_history')
      .insert(historyData);

    if (error) {
      console.error(
        `Error recording player count history for game ${gameId}:`,
        error
      );
    }
  } catch (error) {
    console.error(
      `Error recording player count history for game ${gameId}:`,
      error
    );
  }
}

export async function runPlayerCountSync() {
  console.log('Steam player count sync service started.');
  let totalUpdatedCount = 0;

  const BATCH_SIZE = 100;

  while (true) {
    const thresholdDate = new Date();
    thresholdDate.setHours(thresholdDate.getHours() - UPDATE_INTERVAL_HOURS);

    const { data: games, error } = await supabase
      .from('games')
      .select(
        'id, steam_appid, name, player_count_last_updated, player_count_zero_sync_streak'
      )
      .or(
        `player_count_last_updated.is.null,player_count_last_updated.lt.${thresholdDate.toISOString()}`
      )
      .lt('player_count_zero_sync_streak', 2)
      .eq('steam_app_type', 'game')
      .order('steam_appid', { ascending: true })
      .range(0, BATCH_SIZE - 1);

    if (error) {
      console.error('Error fetching games:', error);
      break;
    }

    if (games.length === 0) {
      console.log('No more games to update player count for.');
      break;
    }

    console.log(`Found ${games.length} games to update player count.`);

    for (const game of games) {
      if (!game.steam_appid) {
        continue;
      }

      const playerCount = await getPlayerCount(Number(game.steam_appid));

      if (playerCount !== null) {
        const currentStreak = game.player_count_zero_sync_streak || 0;
        const newStreak = playerCount < 50 ? currentStreak + 1 : 0;

        const { error: updateError } = await supabase
          .from('games')
          .update({
            current_players: playerCount,
            player_count_last_updated: new Date().toISOString(),
            player_count_zero_sync_streak: newStreak,
          })
          .eq('id', game.id);

        if (updateError) {
          console.error(
            `Error updating player count for game ${game.name}:`,
            updateError
          );
        } else {
          console.log(
            `Updated player count for ${game.name} to ${playerCount}`
          );
          totalUpdatedCount++;
          await recordPlayerCountHistory(String(game.id), playerCount);
        }
      } else {
        // Handle 404 or other errors by updating the timestamp so we don't get stuck
        console.info(
          `Failed to fetch player count for ${game.name} (AppID: ${game.steam_appid}). Marking as updated to avoid loop.`
        );
        const currentStreak = game.player_count_zero_sync_streak || 0;
        const { error: updateError } = await supabase
          .from('games')
          .update({
            player_count_last_updated: new Date().toISOString(),
            player_count_zero_sync_streak: currentStreak + 1,
          })
          .eq('id', game.id);

        if (updateError) {
          console.error(
            `Error updating failure status for game ${game.name}:`,
            updateError
          );
        }
      }

      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }

    // Since we are updating the records, they will no longer match the query criteria in the next iteration.
    // Therefore, we should NOT increment the offset. We always want the "next batch" of pending items.
    // offset += BATCH_SIZE;

    // Wait a bit before fetching the next batch to be safe
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(
    `Player count sync finished. Updated ${totalUpdatedCount} games.`
  );
}

async function runService() {
  let exitCode = 0;
  try {
    await runPlayerCountSync();
  } catch (e) {
    const error = e as Error;
    console.error(`Error in Steam player count sync service:`, error.message);
    console.error(error.stack);
    exitCode = 1;
  } finally {
    process.exit(exitCode);
  }
}

if (require.main === module) {
  void runService();
}
