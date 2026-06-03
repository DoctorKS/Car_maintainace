import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

const cache = new Map<string, { url: string; expiresAt: number }>();
const TTL_SEC = 60 * 50; // 50 minutes (signed URL TTL is 1h)

/**
 * Resolve a Storage path to a signed URL — cached in-memory.
 * Returns `null` while loading; the empty string for missing.
 */
export function useReceiptUrl(path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }
    const cached = cache.get(path);
    if (cached && cached.expiresAt > Date.now()) {
      setUrl(cached.url);
      return;
    }
    let active = true;
    supabase.storage
      .from('receipts')
      .createSignedUrl(path, TTL_SEC)
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) {
          console.warn('[receipt] signed-url error', error);
          setUrl(null);
          return;
        }
        cache.set(path, { url: data.signedUrl, expiresAt: Date.now() + TTL_SEC * 1000 });
        setUrl(data.signedUrl);
      });
    return () => {
      active = false;
    };
  }, [path]);

  return url;
}
