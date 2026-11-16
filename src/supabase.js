// supabase.js: creates the one Supabase client that the whole app shares.
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Supabase's function for making a database client
import { createClient } from '@supabase/supabase-js';
// Project address and public key from config.js
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

// Citizens sign in once and stay signed in: the session is kept in phone storage and renewed automatically.
export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
