import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { Transaction, TransactionWithCategory } from '../../../lib/types';

/** Build query string for GET /transactions (backend decrypts raw_description). */
function transactionsQueryParams(filters?: { startDate?: string; endDate?: string; categoryId?: string }, groupId?: string): string {
  const params = new URLSearchParams();
  if (filters?.startDate) params.set('start_date', filters.startDate);
  if (filters?.endDate) params.set('end_date', filters.endDate);
  if (filters?.categoryId) params.set('category_id', filters.categoryId);
  if (groupId) params.set('group_id', groupId);
  const q = params.toString();
  return q ? `?${q}` : '';
}

export function useTransactions(userId: string, filters?: { startDate?: string; endDate?: string; categoryId?: string }) {
  return useQuery({
    queryKey: ['transactions', userId, filters],
    queryFn: async () => {
      if (!userId) {
        console.warn('No user ID provided to useTransactions');
        return [];
      }

      console.log('Fetching transactions with filters:', { userId, filters });
      const path = `/transactions${transactionsQueryParams(filters)}`;
      const data = await api.get<TransactionWithCategory[]>(path);
      console.log('Transactions response:', Array.isArray(data) ? data.length : 0);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!userId,
    retry: 2,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 10,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
