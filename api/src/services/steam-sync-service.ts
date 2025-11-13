import { supabase } from '../supabase/client';

// Helper function to wait for a specified number of milliseconds
const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Fetches the full list of all Steam games with retry logic
// Note: This endpoint is public (no API key required) but is heavily rate-limited
// and may return 503 errors during high traffic or maintenance periods
async function fetchSteamGames(
  maxRetries: number = 3,
  retryDelay: number = 5000
): Promise<Array<{ appid: number; name: string }>> {
  const url = 'https://api.steampowered.com/ISteamApps/GetAppList/v2/';
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempting to fetch Steam games list (attempt ${attempt}/${maxRetries})...`);
      console.log('Note: This endpoint is rate-limited and may return 503 during high traffic.');
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'GameBacklog/1.0',
        },
      });

      if (!response.ok) {
        // Retry on 5xx errors (server errors) and 429 (rate limit)
        if (
          (response.status >= 500 && response.status < 600) ||
          response.status === 429
        ) {
          if (attempt < maxRetries) {
            const delay = retryDelay * attempt; // Exponential backoff
            console.warn(
              `Steam API returned ${response.status}. Retrying in ${delay}ms...`
            );
            await wait(delay);
            continue;
          }
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data?.applist?.apps) {
        throw new Error('Invalid response format from Steam API');
      }

      console.log(`Successfully fetched ${data.applist.apps.length} games from Steam API.`);
      return data.applist.apps;
    } catch (error) {
      if (attempt === maxRetries) {
        console.error('Failed to fetch Steam games list after all retries:', error);
        console.error('');
        console.error('This is likely due to:');
        console.error('  - Steam API server overload or maintenance');
        console.error('  - Rate limiting on the public GetAppList endpoint');
        console.error('  - Temporary network issues');
        console.error('');
        console.error('Suggestions:');
        console.error('  - Wait a few minutes and try again');
        console.error('  - Check Steam status: https://steamstat.us/');
        console.error('  - Try again during off-peak hours');
        return []; // Return empty array on final failure
      }
      
      // For network errors, retry with exponential backoff
      if (error instanceof Error && error.message.includes('fetch')) {
        const delay = retryDelay * attempt;
        console.warn(
          `Network error occurred. Retrying in ${delay}ms... (${error.message})`
        );
        await wait(delay);
        continue;
      }
      
      // For other errors, don't retry
      console.error('Failed to fetch Steam games list:', error);
      return [];
    }
  }

  return [];
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
