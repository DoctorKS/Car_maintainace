import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { CategoryCode } from '@/lib/categories';
import type { ServiceCenterRow } from '@/types/db';

/** Service centers for the user's dropdown — seeded rows + custom additions. */
export function useServiceCenters(userId: string | undefined): ServiceCenterRow[] {
  const { data } = useQuery({
    queryKey: ['service-centers', userId],
    queryFn: async (): Promise<ServiceCenterRow[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('service_centers')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ServiceCenterRow[];
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
  return data ?? [];
}

/** Custom user-added parts for a specific category. */
export function useCustomParts(
  userId: string | undefined,
  categoryCode: CategoryCode,
): string[] {
  const { data } = useQuery({
    queryKey: ['custom-parts', userId, categoryCode],
    queryFn: async (): Promise<string[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('custom_parts')
        .select('part_name')
        .eq('user_id', userId)
        .eq('category_code', categoryCode);
      if (error) throw error;
      return (data ?? []).map((r) => r.part_name as string);
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
  return data ?? [];
}

export const SERVICE_CENTERS_QK = (userId: string | undefined) => ['service-centers', userId];
export const CUSTOM_PARTS_QK = (
  userId: string | undefined,
  categoryCode: CategoryCode,
) => ['custom-parts', userId, categoryCode];
