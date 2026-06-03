import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes — per spec

/**
 * Drift check for the server-direct architecture.
 *
 * In the offline-first era this hook compared `pending_mutations.count` +
 * Dexie row counts against Supabase. That layer is gone. Now drift means
 * "the React Query cache disagrees with what Supabase currently has":
 *
 *   - Fetch the server's exact-count for `maintenance_visits` and
 *     `maintenance_items` via `select count: 'exact', head: true`
 *     (RLS already scopes to the current user).
 *   - Compare against the cached count React Query has for the same
 *     entities (`visit-count` key + `visits` queries we sum across pages).
 *   - If a mismatch is found, mark `drifted: true` and surface the
 *     reason in `primaryReason`.
 *
 * Auto-polls every 5 minutes while the user is signed in. The dock's
 * 🩺 button can call `refresh()` for a manual check.
 */
export interface DriftResult {
  visitsLocal: number;
  visitsServer: number;
  itemsLocal: number;
  itemsServer: number;
  drifted: boolean;
  primaryReason: string | null;
  checkedAt: number;
}

export interface UseDriftStatus {
  result: DriftResult | null;
  refresh: () => Promise<void>;
}

export function useDriftStatus(
  userId: string | undefined,
  intervalMs: number = DEFAULT_INTERVAL_MS,
): UseDriftStatus {
  const queryClient = useQueryClient();
  const [result, setResult] = useState<DriftResult | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);

  const tick = async (): Promise<void> => {
    if (inFlight.current) return inFlight.current;
    if (!userId || !isSupabaseConfigured()) return;

    inFlight.current = (async () => {
      try {
        const [visitsRes, itemsRes] = await Promise.all([
          supabase
            .from('maintenance_visits')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId),
          supabase
            .from('maintenance_items')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId),
        ]);

        const visitsServer = visitsRes.count ?? 0;
        const itemsServer = itemsRes.count ?? 0;

        // Local counts come from React Query's cache. We use the same
        // query key the dashboard's MaintenanceCardList reads.
        const visitsLocal = (queryClient.getQueryData<number>([
          'visit-count',
          userId,
        ]) ?? -1);
        // For items there's no top-level count query — sum across cached
        // visits pages. -1 means "no signal" so we don't false-positive.
        let itemsLocal = -1;
        const visitPages = queryClient.getQueriesData<
          Array<{ items?: Array<unknown> }>
        >({ queryKey: ['visits', userId] });
        if (visitPages.length > 0) {
          itemsLocal = visitPages.reduce((acc, [, data]) => {
            if (!Array.isArray(data)) return acc;
            return (
              acc + data.reduce((s, v) => s + (v.items?.length ?? 0), 0)
            );
          }, 0);
        }

        const reasons: string[] = [];
        if (visitsLocal >= 0 && visitsLocal !== visitsServer)
          reasons.push(`visits ${visitsLocal}≠${visitsServer}`);
        if (itemsLocal >= 0 && itemsLocal !== itemsServer)
          reasons.push(`items ${itemsLocal}≠${itemsServer}`);

        setResult({
          visitsLocal,
          visitsServer,
          itemsLocal,
          itemsServer,
          drifted: reasons.length > 0,
          primaryReason: reasons[0] ?? null,
          checkedAt: Date.now(),
        });
      } catch (e) {
        // Transient network error — leave the prior result in place so the
        // dot doesn't flicker.
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

export function summarizeDrift(r: DriftResult): string {
  if (!r.drifted) return '🩺 ตรงกัน — local กับ Supabase';
  return `🩺 drift · ${r.primaryReason}`;
}
