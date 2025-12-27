import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { TransactionWithCategory } from '../../../lib/types';

export function useGroupTransactions(
  groupId: string,
  filters?: { startDate?: string; endDate?: string; categoryId?: string }
) {
  return useQuery({
    queryKey: ['groupTransactions', groupId, filters],
    queryFn: async () => {
      if (!groupId) {
        console.log('🔍 useGroupTransactions: No groupId provided');
        return [];
      }

      console.log('🔍 useGroupTransactions: Fetching transactions for group:', groupId);

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

      // Fetch transactions for all members
      let query = supabase
        .from('transactions')
        .select(`
          *,
          category_user:category_user_id ( 
            id,
            name,
            icon
          ),
          category_ai:category_ai_id (
            id,
            name,
            icon
          )
        `)
        .in('user_id', memberIds)
        .order('occurred_at', { ascending: false });

      if (filters?.startDate) {
        console.log('🔍 Filtering by startDate:', filters.startDate);
        query = query.gte('occurred_at', filters.startDate);
      }
      if (filters?.endDate) {
        console.log('🔍 Filtering by endDate:', filters.endDate);
        query = query.lte('occurred_at', filters.endDate);
      }
      if (filters?.categoryId) {
        console.log('🔍 Filtering by categoryId:', filters.categoryId);
        query = query.eq('category_user_id', filters.categoryId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching group transactions:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('✅ Fetched group transactions:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('📊 Transaction user IDs:', [...new Set(data.map(t => t.user_id))]);
      }

      return (data || []) as TransactionWithCategory[];
    },
    enabled: !!groupId,
  });
}

