import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * SUPABASE_CLIENT (v2.0 - PERSISTENCE FIX)
 * Configuration optimisée pour maintenir la session sur mobile (PWA).
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Garde la session active même après fermeture
    autoRefreshToken: true, // Rafraîchit le jeton de sécurité automatiquement
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
});
