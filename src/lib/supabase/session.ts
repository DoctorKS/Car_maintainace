import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './client';

/**
 * Subscribe to auth state. Returns `undefined` while loading the initial
 * session, `null` if signed out, and a `Session` once signed in.
 */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (active) setSession(s ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return session;
}
