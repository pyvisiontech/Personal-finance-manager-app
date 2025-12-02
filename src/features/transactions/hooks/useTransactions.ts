import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { Transaction, TransactionWithCategory } from '../../../lib/types';

export function useTransactions(userId: string, filters?: { startDate?: string; endDate?: string; categoryId?: string }) {
  return useQuery({
    queryKey: ['transactions', userId, filters],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          categories:category_user_id (
            id,
            name,
            icon,
            type
          )
        `)
        .eq('user_id', userId)
        .order('occurred_at', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('occurred_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('occurred_at', filters.endDate);
      }
      if (filters?.categoryId) {
        query = query.eq('category_user_id', filters.categoryId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TransactionWithCategory[];
    },
  });
}

export function useUpdateTransactionCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transactionId, categoryId, userId }: { transactionId: string; categoryId: string; userId: string }) => {
      // Update transaction
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ category_user_id: categoryId })
        .eq('id', transactionId);

      if (updateError) throw updateError;

      // Get old category for feedback
      const { data: transaction } = await supabase
        .from('transactions')
        .select('category_ai_id')
        .eq('id', transactionId)
        .single();

      // Create feedback record for AI training
      if (transaction?.category_ai_id && transaction.category_ai_id !== categoryId) {
        await supabase.from('categorizer_feedback').insert({
          transaction_id: transactionId,
          old_category: transaction.category_ai_id,
          new_category: categoryId,
          user_id: userId,
          source: 'user_override',
        });
      }

      // Create transaction category history
      await supabase.from('transaction_categories').insert({
        transaction_id: transactionId,
        category_id: categoryId,
        assigned_by: 'user_override',
        user_id: userId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

