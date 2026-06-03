import { useEffect, useRef, useState } from 'react';
import { runDriftCheck, type DriftResult } from '@/lib/sync/drift';

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes — per spec

/**
 * Hook for the 🩺 dock button.
 *
 * Runs `runDriftCheck(userId)` once when `userId` is known and then every
 * `intervalMs` (default 5 min). Returns the latest result plus a
 * `refresh()` callback the manual button can fire on demand.
 *
 * The check is cheap (5 HEAD requests + 4 Dexie counts) and quietly
 * swallows transient network failures — UI shouldn't flicker red on a
 * brief blip.
 */
export function useDriftStatus(
  userId: string | undefined,
  intervalMs: number = DEFAULT_INTERVAL_MS,
): { result: DriftResult | null; refresh: () => Promise<void> } {
  const [result, setResult] = useState<DriftResult | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);

  const tick = async (): Promise<void> => {
    if (inFlight.current) return inFlight.current;
    inFlight.current = (async () => {
      try {
        const r = await runDriftCheck(userId);
        setResult(r);
      } catch (e) {
        console.warn('[drift] check failed', e);
      } finally {
        inFlight.current = null;
      }
    })();
    return inFlight.current;
  };

  useEffect(() => {
    if (!userId) {
      setResult(null);
      return;
    }
    void tick();
    const id = window.setInterval(() => void tick(), intervalMs);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, intervalMs]);

  return { result, refresh: tick };
}
