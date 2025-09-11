import { createClient } from '@supabase/supabase-js';
import config from '../config';

if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
  throw new Error('Supabase URL or service role key is not defined in the configuration.');
}

export const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);