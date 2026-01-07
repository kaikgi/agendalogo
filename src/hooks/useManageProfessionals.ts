import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Professional {
  id: string;
  name: string;
  photo_url: string | null;
  active: boolean;
  capacity: number;
  created_at: string;
}

interface CreateProfessionalData {
  establishment_id: string;
  name: string;
  photo_url?: string;
  capacity?: number;
}

export function useManageProfessionals(establishmentId: string | undefined) {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['manage-professionals', establishmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .eq('establishment_id', establishmentId)
        .order('name');
      if (error) throw error;
      return data as Professional[];
    },
    enabled: !!establishmentId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateProfessionalData) => {
      const { error } = await supabase.from('professionals').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-professionals', establishmentId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Professional> & { id: string }) => {
      const { error } = await supabase
        .from('professionals')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-professionals', establishmentId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('professionals')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-professionals', establishmentId] });
    },
  });

  return {
    professionals: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
