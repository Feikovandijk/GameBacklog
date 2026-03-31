import { supabase } from '../supabase/client';

async function checkSchema() {
  console.log('Checking games table schema for missing columns...');

  const columnsToCheck = [
    'steam_appid',
    'name',
    'last_updated',
    'steam_app_type',
    'release_date',
    'header_image',
    'developers',
    'publishers',
    'tags',
    'categories',
    'genres',
    'screenshots',
    'movies',
    'dlc',
    'is_early_access',
    'is_free',
    'has_steam_achievements',
    'platforms_windows',
    'platforms_mac',
    'platforms_linux',
    'total_reviews',
    'price_final',
    'price_initial',
    'discount_percent',
    'total_positive',
    'total_negative',
    'current_players',
    'metacritic_score',
    'required_age',
    'positive_rating_percentage',
    'short_description',
    'detailed_description',
    'about_the_game',
    'website',
    'price_currency',
    'review_score_desc',
    'controller_support',
    'metacritic_url',
    'supported_languages',
    'pc_requirements',
    'mac_requirements',
    'linux_requirements',
  ];

  // Try to select these columns
  const { error } = await supabase
    .from('games')
    .select(columnsToCheck.join(','))
    .limit(1);

  if (error) {
    console.log('Error selecting columns:', error);
    // Parse error message to find which column is missing
    // Message format often: "Could not find the 'column_name' column of 'games' in the schema cache"
  } else {
    console.log('Success! All checked columns exist.');
  }
}

void checkSchema();
