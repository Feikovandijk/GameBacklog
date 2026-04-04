import { supabase } from '../supabase/client';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function debugCount() {
  console.log('Testing Supabase connection...');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
  console.log(
    'SUPABASE_SERVICE_KEY provided:',
    !!process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const { count, error, status, statusText } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log('Error counting games:', error);
      console.log('Status:', status, statusText);
    } else {
      console.log('Successfully counted games:', count);
    }
  } catch (e) {
    console.log('Unexpected error:', e);
  }
}

void debugCount();
