import { supabase } from '../supabase/client';

async function checkAchievementsSchema() {
  console.log('Checking achievements table schema...');
  const { error } = await supabase
    .from('achievements')
    .select('api_name')
    .limit(1);

  if (error) {
    console.log('Error selecting api_name:', error);
  } else {
    console.log('Success! api_name column exists.');
  }

  const { data, error: allColError } = await supabase
    .from('achievements')
    .select('*')
    .limit(1);

  if (allColError) {
    console.log('Error selecting *:', allColError);
  } else if (data && data.length > 0) {
    console.log(
      'Existing columns:',
      Object.keys(data[0] as Record<string, unknown>)
    );
  } else {
    console.log('Table exists but is empty, cannot infer columns from data.');
    // Try to insert a dummy row to see what fails or use a different method if possible,
    // but usually select * on empty table returns empty array.
    // We can try to select specific columns we expect.
    const expectedCols = [
      'id',
      'game_id',
      'steam_appid',
      'name',
      'achievement_id',
      'api_name',
      'display_name',
      'description',
      'icon',
      'icon_gray',
      'hidden',
      'global_percentage',
    ];
    for (const col of expectedCols) {
      const { error: colError } = await supabase
        .from('achievements')
        .select(col)
        .limit(1);
      if (colError) {
        console.log(`Column ${col} MISSING or error: ${colError.message}`);
      } else {
        console.log(`Column ${col} exists.`);
      }
    }
  }
}

void checkAchievementsSchema();
