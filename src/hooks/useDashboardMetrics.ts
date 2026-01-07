import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useDashboardMetrics(establishmentId: string | undefined) {
  const todayQuery = useQuery({
    queryKey: ['metrics-today', establishmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('v_dash_today')
        .select('active_today')
        .eq('establishment_id', establishmentId)
        .maybeSingle();
      return data?.active_today ?? 0;
    },
    enabled: !!establishmentId,
  });

  const weekQuery = useQuery({
    queryKey: ['metrics-week', establishmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('v_dash_week')
        .select('active_week')
        .eq('establishment_id', establishmentId)
        .maybeSingle();
      return data?.active_week ?? 0;
    },
    enabled: !!establishmentId,
  });

  const canceledQuery = useQuery({
    queryKey: ['metrics-canceled', establishmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('v_dash_canceled_7d')
        .select('canceled_7d')
        .eq('establishment_id', establishmentId)
        .maybeSingle();
      return data?.canceled_7d ?? 0;
    },
    enabled: !!establishmentId,
  });

  const byProfessionalQuery = useQuery({
    queryKey: ['metrics-by-professional', establishmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('v_dash_by_professional_30d')
        .select('*')
        .eq('establishment_id', establishmentId);
      return data ?? [];
    },
    enabled: !!establishmentId,
  });

  const topServicesQuery = useQuery({
    queryKey: ['metrics-top-services', establishmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('v_dash_top_services_30d')
        .select('*')
        .eq('establishment_id', establishmentId)
        .order('total_30d', { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!establishmentId,
  });

  return {
    today: todayQuery.data ?? 0,
    week: weekQuery.data ?? 0,
    canceled: canceledQuery.data ?? 0,
    byProfessional: byProfessionalQuery.data ?? [],
    topServices: topServicesQuery.data ?? [],
    isLoading: todayQuery.isLoading || weekQuery.isLoading || canceledQuery.isLoading,
  };
}
