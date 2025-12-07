import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import moment, { Moment } from 'moment';
import { useLayoutEffect } from 'react';
import FloatingActionButton from '../components/FloatingActionButton';


// Types
import { Transaction, Category } from '../../../lib/types';

// Components
import { DateNavigator } from '../components/DateNavigator';
import { FilterMenu, FilterPeriod } from '../components/FilterMenu';
import { SummaryOverview } from '../components/SummaryOverview';
import { ExpenseOverviewChart } from '../components/ExpenseOverviewChart';


// Hooks
import { useAuth } from '../../../context/AuthContext';

// Services
import { supabase } from '../../../lib/supabase';

type RootStackParamList = {
  Dashboard: undefined;
  // Add other screens as needed
};



// Types


interface ProcessedData {
  totalExpense: number;
  totalIncome: number;
  balance: number;
  chartData: Array<{ value: number; color: string; text: string }>;
  breakdown: Array<{ name: string; amount: number; percentage: number; color: string }>;
}

const pieColors = [
  '#3B82F6', // Blue 500
  '#F97316', // Orange 500
  '#10B981', // Emerald 500
  '#EC4899', // Pink 500
  '#8B5CF6', // Violet 500
  '#F59E0B', // Amber 500
  '#06B6D4', // Cyan 500
  '#EF4444', // Red 500
  '#84CC16', // Lime 500
  '#6366F1', // Indigo 500
  '#14B8A6', // Teal 500
  '#D946EF', // Fuchsia 500
  '#0EA5E9', // Sky 500
  '#EAB308', // Yellow 500
  '#64748B', // Slate 500
];

interface CategoryMap {
  [key: string]: {
    name: string;
    amount: number;

  };
}

interface TransactionWithCategory extends Transaction {
  category_user: Category | null;
  category_ai: Category | null;
}

function processTransactionData(
  transactions: TransactionWithCategory[]
): ProcessedData {
  // Filter out non-expense transactions for the expense breakdown
  const expenseTransactions = transactions.filter((tx) => tx.type === 'expense');
  const incomeTransactions = transactions.filter((tx) => tx.type === 'income');

  // Calculate totals
  const totalExpense = expenseTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const totalIncome = incomeTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const balance = totalIncome - totalExpense;

  // Group expenses by category
  const categoryMap: CategoryMap = {};

  expenseTransactions.forEach((tx) => {
    // Use user-assigned category if available, otherwise use AI category
    const category = tx.category_user || tx.category_ai;
    const categoryName = category?.name || 'Uncategorized';
    const categoryId = category?.id || 'uncategorized';

    if (!categoryMap[categoryId]) {
      categoryMap[categoryId] = {
        name: categoryName,
        amount: 0,
        // color will be assigned later based on rank
      };
    }
    categoryMap[categoryId].amount += Math.abs(tx.amount);
  });

  // Sort categories by amount (descending)
  const sortedCategories = Object.entries(categoryMap)
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([id, data], index) => ({
      ...data,
      // Assign color based on rank (index)
      color: pieColors[index % pieColors.length]
    }));

  // Prepare chart data (top 5 categories)
  const chartData = sortedCategories
    .map((category) => ({
      value: category.amount,
      color: category.color,
      text: category.name,
    }));

  // Prepare breakdown data
  const breakdown = sortedCategories.map((category) => ({
    name: category.name,
    amount: category.amount,
    percentage: totalExpense > 0 ? Math.round((category.amount / totalExpense) * 100) : 0,
    color: category.color,
  }));

  return {
    totalExpense,
    totalIncome,
    balance,
    chartData,
    breakdown,
  };
}

const fetchTransactions = async (userId: string, startDate: string, endDate: string): Promise<TransactionWithCategory[]> => {
  try {
    const { data, error } = await supabase
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
      .gte('occurred_at', startDate)
      .lte('occurred_at', endDate)
      .order('occurred_at', { ascending: false });

    if (error) {
      throw error;
    }

    if (!data) {
      console.log('No transaction data returned from Supabase');
      return [];
    }

    // Type guard to ensure data matches TransactionWithCategory
    const isValidTransaction = (tx: any): tx is TransactionWithCategory => {
      return (
        tx &&
        typeof tx.id === 'string' &&
        typeof tx.amount === 'number' &&
        (tx.category_user === null || typeof tx.category_user === 'object') &&
        (tx.category_ai === null || typeof tx.category_ai === 'object')
      );
    };

    return data.filter(isValidTransaction);
  } catch (error) {
    console.error('Error in fetchTransactions:', {
      error,
      userId,
      startDate,
      endDate,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return [];
  }
};

export default function DashboardScreen() {
  const navigation = useNavigation<any>(); // Using any as a temporary measure
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('monthly');
  const [currentDate, setCurrentDate] = useState<Moment>(moment().startOf('month'));
  const [initialLoad, setInitialLoad] = useState(true);
  const [viewMode, setViewMode] = useState<'expense' | 'income'>('expense');

  const handleFilterChange = useCallback((period: FilterPeriod) => {
    setFilterPeriod(period);
    // Reset to current period when changing filter type
    const now = moment();
    setCurrentDate(
      period === 'monthly' ? now.startOf('month') :
        period === 'weekly' ? now.startOf('week') :
          period === 'quarterly' ? now.startOf('quarter') :
            period === 'yearly' ? now.startOf('year') :
              period === 'half-yearly' ? (now.month() < 6 ? now.startOf('year') : now.startOf('year').add(6, 'months')) :
                now.startOf('day')
    );
  }, []);

  useLayoutEffect(() => {
    // Removed header filter menu
    navigation.setOptions({
      headerRight: () => null,
    });
  }, [navigation]);



  // Calculate date range based on filter period
  const startDate = useMemo(() => {
    switch (filterPeriod) {
      case 'daily':
        return moment(currentDate).startOf('day').format('YYYY-MM-DD HH:mm:ss');
      case 'weekly':
        return moment(currentDate).startOf('week').format('YYYY-MM-DD HH:mm:ss');
      case 'monthly':
        return moment(currentDate).startOf('month').format('YYYY-MM-DD HH:mm:ss');
      case 'quarterly':
        return moment(currentDate).startOf('quarter').format('YYYY-MM-DD HH:mm:ss');
      case 'yearly':
        return moment(currentDate).startOf('year').format('YYYY-MM-DD HH:mm:ss');
      case 'half-yearly':
        return moment(currentDate).format('YYYY-MM-DD HH:mm:ss'); // Assumes currentDate is already start of half-year
      default:
        return moment(currentDate).startOf('month').format('YYYY-MM-DD HH:mm:ss');
    }
  }, [filterPeriod, currentDate]);

  const endDate = useMemo(() => {
    switch (filterPeriod) {
      case 'daily':
        return moment(currentDate).endOf('day').format('YYYY-MM-DD HH:mm:ss');
      case 'weekly':
        return moment(currentDate).endOf('week').format('YYYY-MM-DD HH:mm:ss');
      case 'monthly':
        return moment(currentDate).endOf('month').format('YYYY-MM-DD HH:mm:ss');
      case 'quarterly':
        return moment(currentDate).endOf('quarter').format('YYYY-MM-DD HH:mm:ss');
      case 'yearly':
        return moment(currentDate).endOf('year').format('YYYY-MM-DD HH:mm:ss');
      case 'half-yearly':
        return moment(currentDate).add(5, 'months').endOf('month').format('YYYY-MM-DD HH:mm:ss');
      default:
        return moment(currentDate).endOf('month').format('YYYY-MM-DD HH:mm:ss');
    }
  }, [filterPeriod, currentDate]);



  // Fetch the earliest transaction date when user changes
  useEffect(() => {
    const getEarliestTransactionDate = async () => {
      if (!user?.id || !initialLoad) return;

      try {
        const { data } = await supabase
          .from('transactions')
          .select('occurred_at')
          .eq('user_id', user.id)
          .order('occurred_at', { ascending: true })
          .limit(1)
          .single();

        if (data?.occurred_at) {
          setCurrentDate(moment(data.occurred_at).startOf('month'));
        }
      } catch (error) {
        console.error('Error fetching earliest transaction:', error);
      } finally {
        setInitialLoad(false);
      }
    };

    getEarliestTransactionDate();
  }, [user?.id, initialLoad]);

  // Fetch transactions when date range changes or when initial load completes
  // Fetch transactions when date range changes or when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const loadTransactions = async () => {
        if (!user?.id) return;

        console.log(`Fetching transactions from ${startDate} to ${endDate}`);
        setIsLoading(true);
        try {
          const data = await fetchTransactions(user.id, startDate, endDate);
          console.log('Fetched transactions:', data.length);
          setTransactions(data);
        } catch (error) {
          console.error('Failed to load transactions:', error);
        } finally {
          setIsLoading(false);
          setInitialLoad(false);
        }
      };

      loadTransactions();
    }, [user?.id, startDate, endDate])
  );

  // Process transactions data for the UI
  const processed = useMemo(() => {
    console.log('Processing transactions:', transactions.length);
    if (transactions.length === 0) {
      return {
        totalExpense: 0,
        totalIncome: 0,
        balance: 0,
        chartData: [],
        breakdown: []
      };
    }
    return processTransactionData(transactions);
  }, [transactions]);

  const processedIncome = useMemo(() => {
    // Filter income transactions
    const incomeTransactions = transactions.filter((tx) => tx.type === 'income');

    // Group income by category
    const categoryMap: CategoryMap = {};
    const totalIncome = incomeTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    incomeTransactions.forEach((tx) => {
      const category = tx.category_user || tx.category_ai;
      const categoryName = category?.name || 'Uncategorized';
      const categoryId = category?.id || 'uncategorized';

      if (!categoryMap[categoryId]) {
        categoryMap[categoryId] = {
          name: categoryName,
          amount: 0,
        };
      }
      categoryMap[categoryId].amount += Math.abs(tx.amount);
    });

    const sortedCategories = Object.entries(categoryMap)
      .sort((a, b) => b[1].amount - a[1].amount)
      .map(([id, data], index) => ({
        ...data,
        color: pieColors[index % pieColors.length]
      }));

    const chartData = sortedCategories
      .map((category) => ({
        value: category.amount,
        color: category.color,
        text: category.name,
      }));

    const breakdown = sortedCategories.map((category) => ({
      name: category.name,
      amount: category.amount,
      percentage: totalIncome > 0 ? Math.round((category.amount / totalIncome) * 100) : 0,
      color: category.color,
    }));

    return {
      chartData,
      breakdown,
      totalIncome
    };
  }, [transactions]);

  // const handleFilterChange = (period: FilterPeriod) => {
  //   setFilterPeriod(period);
  //   setCurrentDate(
  //     period === 'monthly' ? moment().startOf('month') : moment().startOf('week')
  //   );
  // };

  const handleNavigate = useCallback(
    (direction: 'prev' | 'next') => {
      setCurrentDate((prev) => {
        if (direction === 'prev') {
          return filterPeriod === 'monthly'
            ? moment(prev).subtract(1, 'month').startOf('month')
            : filterPeriod === 'weekly'
              ? moment(prev).subtract(1, 'week').startOf('week')
              : filterPeriod === 'quarterly'
                ? moment(prev).subtract(1, 'quarter').startOf('quarter')
                : filterPeriod === 'yearly'
                  ? moment(prev).subtract(1, 'year').startOf('year')
                  : filterPeriod === 'half-yearly'
                    ? moment(prev).subtract(6, 'months')
                    : moment(prev).subtract(1, 'day').startOf('day');
        } else {
          return filterPeriod === 'monthly'
            ? moment(prev).add(1, 'month').startOf('month')
            : filterPeriod === 'weekly'
              ? moment(prev).add(1, 'week').startOf('week')
              : filterPeriod === 'quarterly'
                ? moment(prev).add(1, 'quarter').startOf('quarter')
                : filterPeriod === 'yearly'
                  ? moment(prev).add(1, 'year').startOf('year')
                  : filterPeriod === 'half-yearly'
                    ? moment(prev).add(6, 'months')
                    : moment(prev).add(1, 'day').startOf('day');
        }
      });
    },
    [filterPeriod]
  );

  // Get the categories by amount
  const topCategories = useMemo(() => {
    return [...processed.breakdown]
      .sort((a, b) => b.amount - a.amount)
  }, [processed.breakdown]);

  // Format period label for display
  const periodLabel = useMemo(() => {
    switch (filterPeriod) {
      case 'daily':
        return currentDate.format('MMM D, YYYY');
      case 'weekly':
        return `${currentDate.startOf('week').format('MMM D')} - ${currentDate.clone().endOf('week').format('MMM D, YYYY')}`;
      case 'monthly':
        return currentDate.format('MMM YYYY');
      case 'quarterly':
        return `${currentDate.format('MMM')} - ${currentDate.clone().endOf('quarter').format('MMM YYYY')}`;
      case 'yearly':
        return currentDate.format('YYYY');
      case 'half-yearly':
        return `${currentDate.format('MMM')} - ${currentDate.clone().add(5, 'months').format('MMM YYYY')}`;
      default:
        return currentDate.format('MMM YYYY');
    }
  }, [filterPeriod, currentDate]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  // Don't show empty state for the entire screen, just handle empty data in components


  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header with Date Navigation and Filter */}
        <View style={styles.headerContainer}>
          <View style={styles.headerContent}>
            <DateNavigator
              currentDate={currentDate}
              onNavigate={handleNavigate}
              periodLabel={periodLabel}
            />
            <View style={styles.filterButtonContainer}>
              <FilterMenu
                selectedPeriod={filterPeriod}
                onPeriodChange={handleFilterChange}
              />
            </View>
          </View>
        </View>

        {/* Summary Overview - Always show, even with 0 values */}
        <View style={styles.summaryContainer}>
          <SummaryOverview
            totalExpense={processed.totalExpense}
            totalIncome={processed.totalIncome}
            balance={processed.balance}
            onExpensePress={() => setViewMode('expense')}
            onIncomePress={() => setViewMode('income')}
            activeView={viewMode}
          />
        </View>

        {/* Overview Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>
            {viewMode === 'expense' ? 'Expense Overview' : 'Income Overview'}
          </Text>

          {(viewMode === 'expense' ? processed.chartData : processedIncome.chartData).length > 0 ? (
            <ExpenseOverviewChart
              chartData={viewMode === 'expense' ? processed.chartData : processedIncome.chartData}
              totalExpense={viewMode === 'expense' ? processed.totalExpense : processedIncome.totalIncome}
              breakdown={viewMode === 'expense' ? topCategories : processedIncome.breakdown}
            />
          ) : (
            <View style={[styles.emptyState, styles.chartPlaceholder]}>
              <View style={styles.placeholderCircle} />
              <Text style={[styles.emptyStateText, { marginTop: 16 }]}>
                {viewMode === 'expense' ? 'No transactions recorded' : 'No income recorded'}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {viewMode === 'expense'
                  ? (filterPeriod === 'daily'
                    ? 'No expenses for this day'
                    : filterPeriod === 'weekly'
                      ? 'No expenses for this week'
                      : 'No expenses for this month')
                  : (filterPeriod === 'daily'
                    ? 'No income for this day'
                    : filterPeriod === 'weekly'
                      ? 'No income for this week'
                      : 'No income for this month')
                }
              </Text>
            </View>
          )}
        </View>


      </ScrollView>
      <FloatingActionButton />
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#f8fafc',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    width: '100%',
  },
  filterButtonContainer: {
    position: 'absolute',
    right: 16,
  },
  sectionContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    marginLeft: 4,
  },
  summaryContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5dc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4b5563',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    marginVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  chartPlaceholder: {
    padding: 40,
  },
  breakdownPlaceholder: {
    padding: 32,
  },
  placeholderCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
});
