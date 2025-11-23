import { supabase } from '../supabase/client';

async function checkColumn() {
  const { error } = await supabase
    .from('games')
    .select('created_at')
    .limit(1);

  if (error) {
    console.log('Error selecting created_at:', error.message);
  } else {
    console.log('Success! Column exists.');
  }
}

void checkColumn();
