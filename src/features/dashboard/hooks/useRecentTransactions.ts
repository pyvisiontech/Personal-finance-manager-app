import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { TransactionWithCategory } from '../../../lib/types';

export function useRecentTransactions(userId: string, limit: number = 5) {
  return useQuery({
    queryKey: ['recentTransactions', userId, limit],
    queryFn: async () => {
      const data = await api.get<TransactionWithCategory[]>(`/transactions?limit=${limit}`);
      return (Array.isArray(data) ? data : []) as TransactionWithCategory[];
    },
    enabled: !!userId,
  });
}

