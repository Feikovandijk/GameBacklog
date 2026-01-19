import { supabase } from '../supabase/client';
import {
  fetchGameDetailsFromSteam,
  updateGameInSupabase,
} from './steam-refresh-service';
import config from '../config';
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
    const topGames = ranks.slice(0, 50);

    for (const rankItem of topGames) {
      const appId = rankItem.appid;
      const concurrentPlayers = rankItem.concurrent_in_game;

      console.log(
        `Processing Trending Game: ID ${appId}, Players: ${concurrentPlayers}`
      );

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
        const steamData = await fetchGameDetailsFromSteam(appId);
        if (steamData) {
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
            await updateGameInSupabase(newGame.id, steamData);
            updatedCount++;
          }
        }
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(
      `Trending Games Sync Completed. Updated/Refreshed ${updatedCount} games.`
    );
  } catch (error) {
    console.error('Error syncing trending games:', error);
  }
}

function extractAppIdFromUrl(url: string): number | null {
  const match = url.match(/\/app\/(\d+)/);
  return match ? parseInt(match[1]) : null;
}

export async function syncPopularNewReleases() {
  console.log('Starting Popular New Releases Sync...');

  try {
    // This endpoint returns "Popular New" releases
    const url = `https://store.steampowered.com/search/results/?filter=popularnew&json=1&count=50`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch popular new games: ${response.statusText}`
      );
    }

    const data = await response.json();
    const items = data.items || [];

    if (items.length === 0) {
      console.log('No popular new games found in response.');
      return;
    }

    console.log(`Found ${items.length} popular new games. Syncing details...`);

    let updatedCount = 0;

    for (const item of items) {
      const logoUrl = item.logo;
      const appIdMatch = logoUrl?.match(/\/apps\/(\d+)\//);

      if (!appIdMatch) {
        console.warn(`Could not extract App ID from logo URL: ${logoUrl}`);
        continue;
      }

      const appId = parseInt(appIdMatch[1]);
      const name = item.name;

      console.log(`Processing Popular New Game: ${name} (ID ${appId})`);
      let currentPlayers = 0;
      try {
        // GetNumberOfCurrentPlayers DOES NOT require a key.
        const playersRes = await fetch(
          `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}`
        );
        if (playersRes.ok) {
          const playersData = await playersRes.json();
          currentPlayers = playersData.response?.player_count || 0;
        }
      } catch (e) {
        console.warn(`Failed to fetch player count for ${appId}`, e);
      }

      // 2. Upsert the game stub immediately
      const { data: existingGame } = await supabase
        .from('games')
        .select('id, last_updated')
        .eq('steam_appid', appId)
        .single();

      if (existingGame) {
        // Update player count
        await supabase
          .from('games')
          .update({ current_players: currentPlayers })
          .eq('id', existingGame.id);

        // Check if needs refresh
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
        // New game insert
        // Insert stub
        const { data: newGame, error } = await supabase
          .from('games')
          .upsert(
            {
              steam_appid: appId,
              name: name,
              current_players: currentPlayers,
              steam_app_type: 'game',
              last_updated: new Date().toISOString(),
              release_date: new Date().toISOString(),
            },
            { onConflict: 'steam_appid' }
          )
          .select()
          .single();

        if (newGame && !error) {
          const steamData = await fetchGameDetailsFromSteam(appId);
          if (steamData) {
            await updateGameInSupabase(newGame.id, steamData);
            updatedCount++;
          }
        }
      }

      // Nice throttle
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(
      `Popular New Releases Sync Completed. Updated/Added ${updatedCount} games.`
    );
  } catch (error) {
    console.error('Error syncing popular new games:', error);
  }
}

// Auto-run if executed directly
if (require.main === module) {
  void (async () => {
    await syncTrendingGames();
    await syncPopularNewReleases();
    // process.exit(0);
  })();
}
