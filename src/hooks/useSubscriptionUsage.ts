import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionUsage {
  plan_code: string;
  plan_name: string;
  status: string;
  current_period_end: string;
  max_professionals: number;
  max_appointments_month: number;
  allow_multi_establishments: boolean;
  current_professionals: number;
  current_appointments_month: number;
  can_add_professional: boolean;
  can_add_appointment: boolean;
  professionals_remaining: number;
  appointments_remaining: number;
}

export function useSubscriptionUsage(establishmentId: string | undefined) {
  return useQuery({
    queryKey: ['subscription-usage', establishmentId],
    queryFn: async (): Promise<SubscriptionUsage | null> => {
      if (!establishmentId) return null;

      const { data, error } = await supabase.rpc('get_subscription_usage', {
        p_establishment_id: establishmentId,
      });

      if (error) {
        console.error('Error fetching subscription usage:', error);
        throw error;
      }

      // Parse the JSON response
      const result = data as unknown as SubscriptionUsage;
      return result;
    },
    enabled: !!establishmentId,
    staleTime: 30000, // 30 seconds
  });
}

// Helper hook to check if a specific action is allowed
export function useCanCreateProfessional(establishmentId: string | undefined) {
  return useQuery({
    queryKey: ['can-create-professional', establishmentId],
    queryFn: async () => {
      if (!establishmentId) return { allowed: false, reason: 'No establishment' };

      const { data, error } = await supabase.rpc('can_create_professional', {
        p_establishment_id: establishmentId,
      });

      if (error) {
        console.error('Error checking can_create_professional:', error);
        return { allowed: false, reason: error.message };
      }

      return data as { allowed: boolean; reason: string };
    },
    enabled: !!establishmentId,
    staleTime: 30000,
  });
}

export function useCanCreateAppointment(establishmentId: string | undefined) {
  return useQuery({
    queryKey: ['can-create-appointment', establishmentId],
    queryFn: async () => {
      if (!establishmentId) return { allowed: false, reason: 'No establishment' };

      const { data, error } = await supabase.rpc('can_create_appointment', {
        p_establishment_id: establishmentId,
      });

      if (error) {
        console.error('Error checking can_create_appointment:', error);
        return { allowed: false, reason: error.message };
      }

      return data as { allowed: boolean; reason: string };
    },
    enabled: !!establishmentId,
    staleTime: 30000,
  });
}
