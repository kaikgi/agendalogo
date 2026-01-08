import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useUserEstablishment() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-establishment', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // First try: user is owner
      const { data: ownedEstablishment, error: ownerError } = await supabase
        .from('establishments')
        .select('*')
        .eq('owner_user_id', user.id)
        .maybeSingle();

      if (ownerError) throw ownerError;
      if (ownedEstablishment) return ownedEstablishment;

      // Second try: user is member (manager/staff)
      const { data: membership, error: memberError } = await supabase
        .from('establishment_members')
        .select('establishment_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberError) throw memberError;
      if (!membership) return null;

      const { data: memberEstablishment, error: estError } = await supabase
        .from('establishments')
        .select('*')
        .eq('id', membership.establishment_id)
        .single();

      if (estError) throw estError;
      return memberEstablishment;
    },
    enabled: !!user,
    staleTime: 60000, // 1 minute cache
    refetchOnWindowFocus: false,
  });
}
