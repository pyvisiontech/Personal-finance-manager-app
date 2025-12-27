import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { StatementImport } from '../../../lib/types';

export function useGroupStatements(groupId: string) {
  return useQuery({
    queryKey: ['groupStatements', groupId],
    queryFn: async () => {
      if (!groupId) {
        console.log('🔍 useGroupStatements: No groupId provided');
        return [];
      }

      console.log('🔍 useGroupStatements: Fetching statements for group:', groupId);

      // First, get all member user IDs for this group
      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId);

      if (membersError) {
        console.error('❌ Error fetching group members:', membersError);
        throw membersError;
      }

      const memberIds = (members || []).map((m) => m.user_id);
      console.log('✅ Found group members:', memberIds.length, 'User IDs:', memberIds);
      
      if (memberIds.length === 0) {
        console.log('⚠️ No members found in group');
        return [];
      }

      // Fetch statements for all members
      const { data, error } = await supabase
        .from('statement_imports')
        .select('*')
        .in('user_id', memberIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching group statements:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('✅ Fetched group statements:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('📊 Statement user IDs:', [...new Set(data.map(s => s.user_id))]);
      }

      return (data || []) as StatementImport[];
    },
    enabled: !!groupId,
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
    refetchOnWindowFocus: true,
  });
}

