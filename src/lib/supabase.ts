import { createClient } from '@supabase/supabase-js';
import { secureGetItem, secureSetItem, secureDeleteItem } from './storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

// Custom storage adapter that works on native (SecureStore) and web (localStorage)
const CrossPlatformAuthStorage = {
  getItem: async (key: string) => {
    return await secureGetItem(key);
  },
  setItem: async (key: string, value: string) => {
    await secureSetItem(key, value);
  },
  removeItem: async (key: string) => {
    await secureDeleteItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: CrossPlatformAuthStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // Enable to detect OAuth callbacks in URL
  },
});

