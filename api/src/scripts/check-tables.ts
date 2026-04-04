import { supabase } from '../supabase/client';

async function checkTables() {
  console.log('Checking database schema...');

  const tablesToCheck = [
    'steam_sync_state',
    'player_count_history',
    'statistics',
    'games',
  ];

  for (const table of tablesToCheck) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      if (error.code === 'PGRST205') {
        console.log(`[MISSING] Table '${table}' does not exist.`);
      } else {
        console.log(`Error checking table '${table}':`, error.message);
      }
    }
  }

  // Check specific columns in games
  console.log('\nChecking columns in games table...');
  const { error } = await supabase
    .from('games')
    .select(
      'player_count_last_updated, player_count_zero_sync_streak, current_players'
    )
    .limit(1);
  if (error) {
    console.log(
      `[MISSING] One or more columns in 'games' table are missing:`,
      error.message
    );
  } else {
    console.log(`[OK] New columns in 'games' table exist.`);
  }

  // Check specific columns in statistics
  console.log('\nChecking columns in statistics table...');
  const { error: statError } = await supabase
    .from('statistics')
    .select('value')
    .limit(1);
  if (statError) {
    console.log(
      `[MISSING] 'value' column in 'statistics' table is missing:`,
      statError.message
    );
  } else {
    console.log(`[OK] 'value' column in 'statistics' table exists.`);
  }
}

void checkTables();
