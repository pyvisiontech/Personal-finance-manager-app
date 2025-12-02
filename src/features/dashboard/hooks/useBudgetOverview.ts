import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';

export interface BudgetOverview {
  totalBudget: number;
  usedAmount: number;
  remainingAmount: number;
  percentageUsed: number;
}

export function useBudgetOverview(userId: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['budgetOverview', userId, startDate, endDate],
    queryFn: async (): Promise<BudgetOverview> => {
      // Get total expenses for the period
      let expenseQuery = supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('type', 'expense');

      if (startDate) {
        expenseQuery = expenseQuery.gte('occurred_at', startDate);
      }
      if (endDate) {
        expenseQuery = expenseQuery.lte('occurred_at', endDate);
      }

      const { data: expenses, error } = await expenseQuery;

      if (error) throw error;

      const usedAmount = expenses.reduce((sum, t) => sum + Number(t.amount), 0);

      // For now, calculate budget as 80% of income (or use a default if no income)
      // In the future, this can be fetched from budget_periods table
      let incomeQuery = supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('type', 'income');

      if (startDate) {
        incomeQuery = incomeQuery.gte('occurred_at', startDate);
      }
      if (endDate) {
        incomeQuery = incomeQuery.lte('occurred_at', endDate);
      }

      const { data: income } = await incomeQuery;
      const totalIncome = income?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Default budget: 80% of income, or 50000 if no income
      const totalBudget = totalIncome > 0 ? totalIncome * 0.8 : 50000;
      const remainingAmount = Math.max(0, totalBudget - usedAmount);
      const percentageUsed = totalBudget > 0 ? (usedAmount / totalBudget) * 100 : 0;

      return {
        totalBudget,
        usedAmount,
        remainingAmount,
        percentageUsed: Math.min(100, percentageUsed),
      };
    },
    enabled: !!userId,
  });
}

