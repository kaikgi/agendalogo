import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ClientAppointment {
  id: string;
  start_at: string;
  end_at: string;
  status: 'booked' | 'confirmed' | 'completed' | 'canceled' | 'no_show';
  customer_notes: string | null;
  service: {
    id: string;
    name: string;
    duration_minutes: number;
    price_cents: number | null;
  };
  professional: {
    id: string;
    name: string;
    photo_url: string | null;
  };
  establishment: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
  };
}

interface UseClientAppointmentsFilters {
  status?: 'booked' | 'confirmed' | 'completed' | 'canceled' | 'no_show' | 'all';
  startDate?: Date;
  endDate?: Date;
}

export function useClientAppointments(filters?: UseClientAppointmentsFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['client-appointments', user?.id, filters],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('appointments')
        .select(`
          id,
          start_at,
          end_at,
          status,
          customer_notes,
          service:services(id, name, duration_minutes, price_cents),
          professional:professionals(id, name, photo_url),
          establishment:establishments(id, name, slug, logo_url, phone, address, city, state)
        `)
        .eq('customer_user_id', user.id)
        .order('start_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.startDate) {
        query = query.gte('start_at', filters.startDate.toISOString());
      }

      if (filters?.endDate) {
        query = query.lte('start_at', filters.endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as ClientAppointment[];
    },
    enabled: !!user?.id,
  });
}

export function useClientAppointmentsByMonth(year: number, month: number) {
  const { user } = useAuth();
  
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

  return useQuery({
    queryKey: ['client-appointments-month', user?.id, year, month],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          start_at,
          end_at,
          status,
          customer_notes,
          service:services(id, name, duration_minutes, price_cents),
          professional:professionals(id, name, photo_url),
          establishment:establishments(id, name, slug, logo_url, phone, address, city, state)
        `)
        .eq('customer_user_id', user.id)
        .gte('start_at', startDate.toISOString())
        .lte('start_at', endDate.toISOString())
        .in('status', ['booked', 'confirmed', 'completed'])
        .order('start_at', { ascending: true });

      if (error) throw error;
      return data as unknown as ClientAppointment[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCancelClientAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'canceled' })
        .eq('id', appointmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['client-appointments-month'] });
    },
  });
}
