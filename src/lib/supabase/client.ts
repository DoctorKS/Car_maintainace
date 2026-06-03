import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Surface in dev — the UI will also show a friendly error in <LoginPage>.
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. ' +
      'Copy .env.example → .env.local and restart `npm run dev`.',
  );
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'cx5-maint-auth',
  },
  global: {
    headers: { 'x-client-info': 'cx5-maintenance-pwa' },
  },
});

export const isSupabaseConfigured = (): boolean => Boolean(url && anonKey);
