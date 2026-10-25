// supabase.js: creates the one Supabase client that the whole app shares.
import 'react-native-url-polyfill/auto';
// Supabase's function for making a database client
import { createClient } from '@supabase/supabase-js';
// Project address and public key from config.js
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

// Citizens never log in, so no session is stored.
export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});