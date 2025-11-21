import { supabase } from '../supabase/client';

import config from '../config';

// Fetches the full list of all Steam games
async function fetchSteamGames(): Promise<
  Array<{ appid: number; name: string }>
> {
  if (!config.steamApiKey) {
    console.error('Steam API key is missing. Cannot fetch games list.');
    return [];
  }

  const allApps: Array<{ appid: number; name: string }> = [];
  let lastAppId: number | undefined;
  let hasMore = true;

  console.log('Fetching full game list from Steam (this may take a few requests)...');

  while (hasMore) {
    let url = `https://api.steampowered.com/IStoreService/GetAppList/v1/?key=${config.steamApiKey}&include_games=true&include_dlc=false&include_software=false&include_videos=false&include_hardware=false&max_results=50000`;

    if (lastAppId) {
      url += `&last_appid=${lastAppId}`;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const apps = data.response.apps;

      if (!apps || apps.length === 0) {
        hasMore = false;
        break;
      }

      allApps.push(...apps);

      if (data.response.last_appid) {
        lastAppId = data.response.last_appid;
      } else {
        hasMore = false;
      }

    } catch (error) {
      console.error('Failed to fetch Steam games list:', error);
      hasMore = false; // Stop on error to avoid infinite loops
    }
  }

  console.log(`Total games fetched from Steam: ${allApps.length}`);
  return allApps;
}

// Fetches all game IDs currently in the Supabase database
async function getExistingGameIds(): Promise<Set<number>> {
  const existingIds = new Set<number>();
  let hasMore = true;
  let page = 0;
  const pageSize = 5000;

  console.log('Fetching existing game IDs page by page...');
  while (hasMore) {
    const { data, error } = await supabase
      .from('games')
      .select('steam_appid')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Error fetching existing game IDs from Supabase:', error);
      hasMore = false;
      break;
    }

    if (data.length > 0) {
      data.forEach(doc => {
        if (doc.steam_appid) {
          existingIds.add(Number(doc.steam_appid));
        }
      });
      console.log(
        `Page ${page + 1}: Fetched ${data.length} documents. Total unique so far: ${existingIds.size}`
      );
      page++;
      if (data.length < pageSize) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }
  return existingIds;
}

// Adds new games to the Supabase database in batches
async function addNewGames(newGames: Array<{ appid: number; name: string }>) {
  const BATCH_SIZE = 100;
  for (let i = 0; i < newGames.length; i += BATCH_SIZE) {
    const batch = newGames.slice(i, i + BATCH_SIZE);

    const gamesToInsert = batch.map(game => ({
      steam_appid: game.appid,
      name: game.name,
    }));

    const { error } = await supabase
      .from('games')
      .upsert(gamesToInsert, { onConflict: 'steam_appid' });

    if (error) {
      console.error(`Error adding new games to Supabase:`, error);
    } else {
      console.log(`--- Batch of ${batch.length} processed. ---`);
    }

    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
  }
}

async function updateTotalGamesStat(totalCount: number) {
  const KEY = 'totalGames';
  try {
    console.log(`Updating total games count to: ${totalCount}`);
    const { error } = await supabase
      .from('statistics')
      .update({ count: totalCount })
      .eq('key', KEY);

    if (error) {
      console.error('Failed to update total games stat:', error);
    } else {
      console.log('Successfully updated total games stat.');
    }
  } catch (error) {
    console.error('Failed to update total games stat:', error);
  }
}

async function runSyncService() {
  try {
    console.log('Starting Steam AppID sync service...');

    // 1. Fetch all games from Steam API
    console.log('Fetching all games from Steam...');
    const allSteamGames = await fetchSteamGames();
    if (allSteamGames.length === 0) {
      console.error('Steam games list is empty. Aborting sync.');
      return;
    }
    console.log(`Found ${allSteamGames.length} total games on Steam.`);

    // 2. Fetch all existing game IDs from Supabase
    console.log('Fetching existing game IDs from database...');
    const existingGameIds = await getExistingGameIds();
    console.log(
      `Found ${existingGameIds.size} existing games in the database.`
    );

    // 3. Determine which games are new
    const newGames = allSteamGames.filter(
      game => !existingGameIds.has(game.appid)
    );
    console.log(`Found ${newGames.length} new games to add.`);

    if (newGames.length > 0) {
      // 4. Add new games to Supabase
      await addNewGames(newGames);

      // 5. After syncing, update the total games count to the new total in the database
      const newTotalCount = existingGameIds.size + newGames.length;
      await updateTotalGamesStat(newTotalCount);
    }

    console.log('Steam sync completed successfully.');
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('A critical error occurred in the sync service:', message);
    process.exit(1);
  }
}

// Autorun the service when the script is executed
if (require.main === module) {
  void runSyncService();
}
