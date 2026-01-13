import { supabase } from '../supabase/client';
import {
  fetchGameDetailsFromSteam,
  updateGameInSupabase,
} from '../services/steam-refresh-service';

async function debugMissingImages() {
  console.log('Starting missing images debug script...');

  // 1. Count games with missing images
  const { count, error: countError } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true })
    .is('header_image', null);

  if (countError) {
    console.error('Error counting games with missing images:', countError);
    return;
  }

  console.log(`Found ${count} games with missing header_image.`);

  if (count === 0) {
    console.log('No games found with missing images. Mission accomplished?');
    return;
  }

  // 2. Fetch a sample of these games
  const { data: games, error: fetchError } = await supabase
    .from('games')
    .select('id, name, steam_appid')
    .is('header_image', null)
    .limit(5);

  if (fetchError) {
    console.error('Error fetching sample games:', fetchError);
    return;
  }

  console.log('Sample games with missing images:', games);

  // 3. Try to fetch details for the first one
  if (games && games.length > 0) {
    const testGame = games[0];
    console.log(
      `\nAttempting to fetch details for game: ${testGame.name} (AppID: ${testGame.steam_appid})...`
    );

    if (!testGame.steam_appid) {
      console.log('Game has no steam_appid, cannot fetch.');
      return;
    }

    const steamData = await fetchGameDetailsFromSteam(
      Number(testGame.steam_appid)
    );

    if (steamData) {
      console.log('Successfully fetched steam data!');
      console.log('Header Image URL:', steamData.header_image);

      console.log('Attempting to update in Supabase...');
      const success = await updateGameInSupabase(testGame.id, steamData);
      console.log('Update success:', success);
    } else {
      console.log('Failed to fetch steam data (returned null).');
    }
  }
}

// Execute
debugMissingImages().catch(console.error);
