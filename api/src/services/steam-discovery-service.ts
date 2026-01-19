import { supabase } from '../supabase/client';
import {
  fetchGameDetailsFromSteam,
  updateGameInSupabase,
} from './steam-refresh-service';
import config from '../config';

/**
 * Syncs the "Trending" or "Most Played" games from Steam.
 * Since we don't have a direct "Most Played" endpoint in the public Store API that gives us IDs easily without scraping,
 * we can use the 'ISteamChartsService' if available, or fall back to a known proxy/endpoint.
 *
 * For this implementation, we'll use the Steam Web API `ISteamChartsService/GetGamesByConcurrentPlayers`
 * which is a reliable way to get top played games.
 */
export async function syncTrendingGames() {
  console.log('Starting Trending Games Sync...');

  try {
    // This endpoint returns the top games by concurrent players
    const url = `https://api.steampowered.com/ISteamChartsService/GetGamesByConcurrentPlayers/v1/?partner=0`;

    // Config for fetch
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch trending games: ${response.statusText}`);
    }

    const data = await response.json();
    const ranks = data.response?.ranks || [];

    if (ranks.length === 0) {
      console.log('No trending games found in response.');
      return;
    }

    console.log(`Found ${ranks.length} trending games. Syncing details...`);

    let updatedCount = 0;

    // We process only the top 50 to avoid rate limits and keep it fast
    const topGames = ranks.slice(0, 50);

    for (const rankItem of topGames) {
      const appId = rankItem.appid;
      const concurrentPlayers = rankItem.concurrent_in_game;

      console.log(
        `Processing Trending Game: ID ${appId}, Players: ${concurrentPlayers}`
      );

      // 1. Update the 'current_players' count immediately if the game exists
      // We do this first to ensure even if we don't do a full metadata refresh, the player count is fresh.
      const { data: existingGame } = await supabase
        .from('games')
        .select('id, last_updated')
        .eq('steam_appid', appId)
        .single();

      if (existingGame) {
        await supabase
          .from('games')
          .update({ current_players: concurrentPlayers })
          .eq('id', existingGame.id);

        // Optional: If it hasn't been updated in 24h, force a refresh
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        if (new Date(existingGame.last_updated) < oneDayAgo) {
          const steamData = await fetchGameDetailsFromSteam(appId);
          if (steamData) {
            await updateGameInSupabase(existingGame.id, steamData);
            updatedCount++;
          }
        }
      } else {
        // New game! We must fetch details and insert it.
        // We need to "create" it. updateGameInSupabase handles "upsert" effectively if passing a valid ID?
        // Actually `updateGameInSupabase` takes a `gameId`. If we don't have one, we might need a different approach
        // OR we rely on `steam-pics-refresh-service` logic which handles upserts.
        // Let's reuse the logic: extract fetching into a helper or just do it here.
        // The `steam-refresh-service` accepts a UUID. We might not have one.
        // For simplicity/safety: We see if `updateGameInSupabase` can handle creation if passed a placeholder or we create a stub first.

        // Actually, best practice: Insert a stub using steam_appid if possible, or just fetch full data and insert.
        // Let's fetch full data first.
        const steamData = await fetchGameDetailsFromSteam(appId);
        if (steamData) {
          // We rely on Supabase to generate the ID or we specific the steam_appid.
          // Our `games` table usually has `steam_appid` as unique.
          // Let's try to upsert with just steam_appid match.

          // Reuse `steam-refresh-service` logic but slightly modified for new insert?
          // `updateGameInSupabase` updates by `id`.
          // We will manually insert here to avoid complexity of refactoring the other service right now.

          const { data: newGame, error } = await supabase
            .from('games')
            .upsert(
              {
                steam_appid: appId,
                name: steamData.name || `App ${appId}`,
                current_players: concurrentPlayers,
                steam_app_type: 'game',
                last_updated: new Date().toISOString(),
              },
              { onConflict: 'steam_appid' }
            )
            .select()
            .single();

          if (newGame && !error) {
            // Now perform full update using the helper which knows how to map all fields
            await updateGameInSupabase(newGame.id, steamData);
            updatedCount++;
          }
        }
      }

      // nice throttle
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(
      `Trending Games Sync Completed. Updated/Refreshed ${updatedCount} games.`
    );
  } catch (error) {
    console.error('Error syncing trending games:', error);
  }
}

// Auto-run if executed directly
if (require.main === module) {
  void syncTrendingGames().then(() => {
    // Optional: exit process if needed, or let node handle it
    // process.exit(0);
  });
}
