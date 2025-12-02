import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { CategoryExpense, ExpenseOverview } from '../../../lib/types';

export function useExpenseOverview(userId: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['expenseOverview', userId, startDate, endDate],
    queryFn: async (): Promise<ExpenseOverview> => {
      let expenseQuery = supabase
        .from('transactions')
        .select('amount, type, category_user_id, categories:category_user_id(id, name, icon)')
        .eq('user_id', userId)
        .eq('type', 'expense');

      let incomeQuery = supabase
        .from('transactions')
        .select('amount, type')
        .eq('user_id', userId)
        .eq('type', 'income');

      if (startDate) {
        expenseQuery = expenseQuery.gte('occurred_at', startDate);
        incomeQuery = incomeQuery.gte('occurred_at', startDate);
      }
      if (endDate) {
        expenseQuery = expenseQuery.lte('occurred_at', endDate);
        incomeQuery = incomeQuery.lte('occurred_at', endDate);
      }

      const [expenseResult, incomeResult] = await Promise.all([
        expenseQuery,
        incomeQuery,
      ]);

      if (expenseResult.error) throw expenseResult.error;
      if (incomeResult.error) throw incomeResult.error;

      // Calculate totals
      const totalExpense = expenseResult.data.reduce((sum, t) => sum + Number(t.amount), 0);
      const totalIncome = incomeResult.data.reduce((sum, t) => sum + Number(t.amount), 0);

      // Group by category
      const categoryMap = new Map<string, CategoryExpense>();

      expenseResult.data.forEach((transaction: any) => {
        const categoryId = transaction.category_user_id || 'uncategorized';
        const category = transaction.categories || { id: 'uncategorized', name: 'Uncategorized', icon: '📦' };

        if (!categoryMap.has(categoryId)) {
          categoryMap.set(categoryId, {
            category_id: categoryId,
            category_name: category.name || 'Uncategorized',
            category_icon: category.icon || '📦',
            total_amount: 0,
            transaction_count: 0,
          });
        }

        const existing = categoryMap.get(categoryId)!;
        existing.total_amount += Number(transaction.amount);
        existing.transaction_count += 1;
      });

      return {
        total_expense: totalExpense,
        total_income: totalIncome,
        categories: Array.from(categoryMap.values()).sort((a, b) => b.total_amount - a.total_amount),
      };
    },
  });
}

