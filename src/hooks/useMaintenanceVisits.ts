import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type {
  MaintenanceItemRow,
  MaintenanceVisitRow,
  ServiceCenterRow,
} from '@/types/db';
import type { MaintenanceVisitWithItems } from '@/types/domain';

/**
 * Server-direct visit hooks. Replaces the Dexie + useLiveQuery layer.
 *
 * Mutations in `src/lib/api.ts` must call
 * `queryClient.invalidateQueries({ queryKey: ['visits', userId] })`
 * (and ['vehicle', userId] for mileage edits, etc.) so the UI refreshes
 * after a save / delete.
 */

interface VisitWithEmbed extends MaintenanceVisitRow {
  service_center?: ServiceCenterRow | null;
  items?: MaintenanceItemRow[];
}

function hydrateRow(v: VisitWithEmbed): MaintenanceVisitWithItems {
  const items = v.items ?? [];
  return {
    ...(v as MaintenanceVisitRow),
    items,
    service_center: v.service_center ?? null,
    total_amount: items.reduce((s, i) => s + Number(i.total_price ?? 0), 0),
  };
}

interface Page {
  limit?: number;
  offset?: number;
}

export const VISITS_QK = (userId: string | undefined) => ['visits', userId];

/** Paginated visit list, newest first. */
export function useMaintenanceVisits(
  userId: string | undefined,
  options: Page = {},
): MaintenanceVisitWithItems[] {
  const { limit, offset = 0 } = options;
  const { data } = useQuery({
    queryKey: ['visits', userId, 'page', limit ?? 'all', offset],
    queryFn: async (): Promise<MaintenanceVisitWithItems[]> => {
      if (!userId) return [];
      let query = supabase
        .from('maintenance_visits')
        .select('*, service_center:service_centers(*), items:maintenance_items(*)')
        .eq('user_id', userId)
        .order('service_date', { ascending: false });
      if (limit !== undefined) query = query.range(offset, offset + limit - 1);
      else if (offset > 0) query = query.range(offset, offset + 999);
      const { data, error } = await query;
      if (error) throw error;
      return (data as unknown as VisitWithEmbed[]).map(hydrateRow);
    },
    enabled: !!userId,
    staleTime: 10_000,
  });
  return data ?? [];
}

/** Single visit hydrated with items + center — for the edit form. */
export function useVisitWithItems(
  visitId: string | undefined,
): MaintenanceVisitWithItems | null {
  const { data } = useQuery({
    queryKey: ['visit', visitId],
    queryFn: async (): Promise<MaintenanceVisitWithItems | null> => {
      if (!visitId) return null;
      const { data, error } = await supabase
        .from('maintenance_visits')
        .select('*, service_center:service_centers(*), items:maintenance_items(*)')
        .eq('id', visitId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return hydrateRow(data as unknown as VisitWithEmbed);
    },
    enabled: !!visitId,
    staleTime: 10_000,
  });
  return data ?? null;
}

/** Visits whose service_date falls in [fromIso, toIso] inclusive. */
export function useVisitsInRange(
  userId: string | undefined,
  fromIso: string,
  toIso: string,
): MaintenanceVisitWithItems[] {
  const { data } = useQuery({
    queryKey: ['visits', userId, 'range', fromIso, toIso],
    queryFn: async (): Promise<MaintenanceVisitWithItems[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('maintenance_visits')
        .select('*, service_center:service_centers(*), items:maintenance_items(*)')
        .eq('user_id', userId)
        .gte('service_date', fromIso)
        .lte('service_date', toIso)
        .order('service_date', { ascending: false });
      if (error) throw error;
      return (data as unknown as VisitWithEmbed[]).map(hydrateRow);
    },
    enabled: !!userId,
    staleTime: 10_000,
  });
  return data ?? [];
}

/** Just the set of dates with at least one visit in [from, to]. */
export function useVisitDateSet(
  userId: string | undefined,
  fromIso: string,
  toIso: string,
): Set<string> {
  const { data } = useQuery({
    queryKey: ['visit-dates', userId, fromIso, toIso],
    queryFn: async (): Promise<Set<string>> => {
      if (!userId) return new Set<string>();
      const { data, error } = await supabase
        .from('maintenance_visits')
        .select('service_date')
        .eq('user_id', userId)
        .gte('service_date', fromIso)
        .lte('service_date', toIso);
      if (error) throw error;
      const out = new Set<string>();
      for (const r of data as { service_date: string }[]) out.add(r.service_date);
      return out;
    },
    enabled: !!userId,
    staleTime: 10_000,
  });
  return data ?? new Set<string>();
}

export function useVisitCount(userId: string | undefined): number {
  const { data } = useQuery({
    queryKey: ['visit-count', userId],
    queryFn: async (): Promise<number> => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from('maintenance_visits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!userId,
    staleTime: 10_000,
  });
  return data ?? 0;
}
