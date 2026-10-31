import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

// Read environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Validate environment variables
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your-project-id') &&
    supabaseAnonKey !== 'your-supabase-anon-key-here' &&
    supabaseAnonKey.length > 20
  );
};

let clientInstance: SupabaseClient<Database> | null = null;

/**
 * Returns the initialized Supabase client singleton.
 * Uses typed schema for database queries, RLS, and RPC functions.
 */
export const getSupabaseClient = (): SupabaseClient<Database> | null => {
  if (clientInstance) {
    return clientInstance;
  }

  if (isSupabaseConfigured()) {
    clientInstance = createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      db: {
        schema: 'public',
      },
    });
    console.info('⚡ [Brightloop] Connected directly to live Supabase backend:', supabaseUrl);
    return clientInstance;
  }

  console.info(
    'ℹ️ [Brightloop] Supabase credentials not found or placeholder in .env. Running in High-Fidelity Reactive Engine mode with local persistence.'
  );
  return null;
};

// Export direct client instance (or a dummy safe client for typing)
export const supabase = getSupabaseClient() || (createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
));
