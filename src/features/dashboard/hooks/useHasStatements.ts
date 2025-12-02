import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';

export function useHasStatements(userId: string) {
  return useQuery({
    queryKey: ['hasStatements', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('statement_imports')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (error) throw error;
      return (data?.length || 0) > 0;
    },
    enabled: !!userId,
  });
}

