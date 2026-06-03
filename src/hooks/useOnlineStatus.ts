import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/sync/db';

export function useOnlineStatus(): {
  online: boolean;
  pending: number;
  lastError: string | null;
} {
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const pending = useLiveQuery(() => db.pending_mutations.count(), [], 0) ?? 0;
  const lastError =
    (useLiveQuery(() => db.meta.get('lastFlushError'))?.value as string | null | undefined) ?? null;

  return { online, pending, lastError };
}
