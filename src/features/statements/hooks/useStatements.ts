import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { StatementImport } from '../../../lib/types';

export function useStatements(userId: string) {
  return useQuery({
    queryKey: ['statement_imports', userId],
    queryFn: async () => {
      if (!userId) {
        console.warn('No user ID provided to useStatements');
        return [];
      }

      console.log('Fetching statements for user:', userId);
      
      try {
        const { data, error } = await supabase
          .from('statement_imports')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Supabase query error:', error);
          throw new Error(error.message || 'Failed to fetch statements');
        }
        
        console.log('Fetched statements:', data?.length);
        return (data || []) as StatementImport[];
      } catch (error) {
        console.error('Error fetching statements:', error);
        throw error;
      }
    },
    enabled: !!userId,
    staleTime: 0, // Always refetch from server when polling so we see "Completed" as soon as backend updates
    refetchInterval: (query) => {
      const statements = query.state.data as StatementImport[] | undefined;
      if (!statements || statements.length === 0) return false;

      const hasProcessingStatements = statements.some(
        (stmt) => stmt.status === 'processing' || stmt.status === 'uploaded'
      );

      return hasProcessingStatements ? 2000 : false; // Poll every 2s while any statement is in progress
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}
