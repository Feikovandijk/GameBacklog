import dotenv from 'dotenv';
import path from 'path';
// Load env vars from api/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

import { fetchGameDetailsFromSteam } from '../src/services/steam-refresh-service';
import { updateGameInSupabase } from '../src/services/steam-refresh-service';
import { supabase } from '../src/supabase/client';

async function forceSync(appId: number) {
  console.log(`Force syncing App ID: ${appId}...`);

  try {
    const steamData = await fetchGameDetailsFromSteam(appId);
    if (!steamData) {
      console.error('Failed to fetch data from Steam.');
      return;
    }

    console.log(`Fetched Steam Data for: ${steamData.name}`);
    console.log(`Header Image: ${steamData.header_image}`);

    // Check if game exists
    const { data: existing } = await supabase
      .from('games')
      .select('id')
      .eq('steam_appid', appId)
      .single();

    let gameId;
    if (existing) {
      gameId = existing.id;
      console.log(`Game exists with ID: ${gameId}`);
    } else {
      console.log('Game does not exist, creating stub...');
      const { data: newGame, error } = await supabase
        .from('games')
        .upsert(
          {
            steam_appid: appId,
            name: steamData.name || `App ${appId}`,
            steam_app_type: 'game',
            last_updated: new Date().toISOString(),
          },
          { onConflict: 'steam_appid' }
        )
        .select()
        .single();

      if (error || !newGame) {
        console.error('Failed to create game:', error);
        return;
      }
      gameId = newGame.id;
    }

    // Update
    await updateGameInSupabase(gameId, steamData);
    console.log('Update complete!');
  } catch (err) {
    console.error('Error:', err);
  }
}

// RV There Yet?
forceSync(3949040);
