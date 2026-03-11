import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { TransactionWithCategory } from '../../../lib/types';

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
      const path = `/transactions${transactionsQueryParams(filters, groupId)}`;
      const data = await api.get<TransactionWithCategory[]>(path);
      const list = Array.isArray(data) ? data : [];
      console.log('✅ Fetched group transactions:', list.length);
      return list as TransactionWithCategory[];
    },
    enabled: !!groupId,
  });
}

