import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { Transaction, TransactionWithCategory } from '../../../lib/types';

export function useTransactions(userId: string, filters?: { startDate?: string; endDate?: string; categoryId?: string }) {
  return useQuery({
    queryKey: ['transactions', userId, filters],
    queryFn: async () => {
      if (!userId) {
        console.warn('No user ID provided to useTransactions');
        return [];
      }

      console.log('Fetching transactions with filters:', { userId, filters });
      
      try {
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
          .eq('user_id', userId)
          .order('occurred_at', { ascending: false });

        if (filters?.startDate) {
          console.log('Applying start date filter:', filters.startDate);
          query = query.gte('occurred_at', filters.startDate);
        }
        if (filters?.endDate) {
          console.log('Applying end date filter:', filters.endDate);
          query = query.lte('occurred_at', filters.endDate);
        }
        if (filters?.categoryId) {
          console.log('Applying category filter:', filters.categoryId);
          query = query.eq('category_user_id', filters.categoryId);
        }

        const { data, error, status, statusText } = await query;
        console.log('Query response:', { status, statusText, data: data?.length, error });
        
        if (error) {
          console.error('Supabase query error:', error);
          throw new Error(error.message || 'Failed to fetch transactions');
        }
        
        return data as TransactionWithCategory[];
      } catch (error) {
        console.error('Error in useTransactions queryFn:', error);
        throw error;
      }
    },
    enabled: !!userId, // Only run the query if userId exists
    retry: 2, // Retry failed requests twice before showing an error
  });
}
