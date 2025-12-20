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
    // Automatically refetch every 5 seconds if there are statements still processing
    refetchInterval: (query) => {
      const statements = query.state.data as StatementImport[] | undefined;
      if (!statements || statements.length === 0) return false;
      
      // Check if any statement is still processing or uploaded (waiting to be processed)
      const hasProcessingStatements = statements.some(
        (stmt) => stmt.status === 'processing' || stmt.status === 'uploaded'
      );
      
      // Poll every 5 seconds if there are processing statements, otherwise don't poll
      return hasProcessingStatements ? 5000 : false;
    },
    // Refetch when the screen comes into focus
    refetchOnWindowFocus: true,
  });
}
