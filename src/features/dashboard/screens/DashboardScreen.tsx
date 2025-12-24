import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import moment, { Moment } from 'moment';
import { useLayoutEffect } from 'react';
import FloatingActionButton from '../components/FloatingActionButton';


// Types
import { Transaction, Category, TransactionWithCategory } from '../../../lib/types';

// Components
import { DateNavigator } from '../components/DateNavigator';
import { FilterMenu, FilterPeriod } from '../components/FilterMenu';
import { SummaryOverview } from '../components/SummaryOverview';
import { ExpenseOverviewChart } from '../components/ExpenseOverviewChart';
import { TotalOverviewChart } from '../components/TotalOverviewChart';
import { NotificationIcon } from '../components/NotificationIcon';
import { ProfileMenu } from '../components/ProfileMenu';


// Hooks
import { useAuth } from '../../../context/AuthContext';
import { useFilter } from '../../../context/FilterContext';
import { useTransactions } from '../../transactions/hooks/useTransactions';

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
  breakdown: Array<{ name: string; amount: number; percentage: number; color: string; icon?: string }>;
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
    icon?: string;
  };
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
    const categoryIcon = category?.icon || '📦';

    if (!categoryMap[categoryId]) {
      categoryMap[categoryId] = {
        name: categoryName,
        amount: 0,
        icon: categoryIcon,
        // color will be assigned later based on rank
      };
    }
    categoryMap[categoryId].amount += Math.abs(tx.amount);
  });

  // Sort categories by amount (descending) and prepare chart/breakdown data
  const sortedEntries = Object.entries(categoryMap)
    .sort((a, b) => b[1].amount - a[1].amount);

  // Prepare chart data
  const chartData = sortedEntries
    .map(([id, data], index) => ({
      value: data.amount,
      color: pieColors[index % pieColors.length],
      text: data.name,
    }));

  // Prepare breakdown data with categoryId
  const breakdown = sortedEntries.map(([id, data], index) => ({
    name: data.name,
    amount: -data.amount, // Negate to show as expense
    percentage: totalExpense > 0 ? Math.round((data.amount / totalExpense) * 100) : 0,
    color: pieColors[index % pieColors.length],
    icon: data.icon,
    categoryId: id,
  }));

  return {
    totalExpense,
    totalIncome,
    balance,
    chartData,
    breakdown,
  };
}


export default function DashboardScreen() {
  const navigation = useNavigation<any>(); // Using any as a temporary measure
  const { user, authReady } = useAuth();
  const { filterPeriod, currentDate, updateFilter } = useFilter();
  const [viewMode, setViewMode] = useState<'expense' | 'income' | 'total'>('expense');


  const handleFilterChange = useCallback((period: FilterPeriod) => {
    // Reset to current period when changing filter type
    const now = moment();
    const newDate = period === 'monthly' ? now.startOf('month') :
      period === 'weekly' ? now.startOf('week') :
        period === 'quarterly' ? now.startOf('quarter') :
          period === 'yearly' ? now.startOf('year') :
            period === 'half-yearly' ? (now.month() < 6 ? now.startOf('year') : now.startOf('year').add(6, 'months')) :
              now.startOf('day');

    // Update the shared filter context
    updateFilter(period, newDate);
  }, [updateFilter]);

  useLayoutEffect(() => {
    // Add notification bell and profile icon to header
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerRight}>
          <NotificationIcon />
          <ProfileMenu />
        </View>
      ),
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

  // Previous period range for comparison in Total view
  const { prevStartDate, prevEndDate, comparisonLabel } = useMemo(() => {
    let prevStart: string;
    let prevEnd: string;
    let label: string;

    switch (filterPeriod) {
      case 'daily': {
        const prev = moment(currentDate).subtract(1, 'day');
        prevStart = prev.startOf('day').format('YYYY-MM-DD HH:mm:ss');
        prevEnd = prev.endOf('day').format('YYYY-MM-DD HH:mm:ss');
        label = 'the previous day';
        break;
      }
      case 'weekly': {
        const prev = moment(currentDate).subtract(1, 'week');
        prevStart = prev.startOf('week').format('YYYY-MM-DD HH:mm:ss');
        prevEnd = prev.endOf('week').format('YYYY-MM-DD HH:mm:ss');
        label = 'last week';
        break;
      }
      case 'quarterly': {
        const prev = moment(currentDate).subtract(1, 'quarter');
        prevStart = prev.startOf('quarter').format('YYYY-MM-DD HH:mm:ss');
        prevEnd = prev.endOf('quarter').format('YYYY-MM-DD HH:mm:ss');
        label = 'last quarter';
        break;
      }
      case 'yearly': {
        const prev = moment(currentDate).subtract(1, 'year');
        prevStart = prev.startOf('year').format('YYYY-MM-DD HH:mm:ss');
        prevEnd = prev.endOf('year').format('YYYY-MM-DD HH:mm:ss');
        label = 'last year';
        break;
      }
      case 'half-yearly': {
        const prev = moment(currentDate).subtract(6, 'months');
        prevStart = prev.startOf('month').format('YYYY-MM-DD HH:mm:ss');
        prevEnd = prev.add(5, 'months').endOf('month').format('YYYY-MM-DD HH:mm:ss');
        label = 'the previous 6 months';
        break;
      }
      case 'monthly':
      default: {
        const prev = moment(currentDate).subtract(1, 'month');
        prevStart = prev.startOf('month').format('YYYY-MM-DD HH:mm:ss');
        prevEnd = prev.endOf('month').format('YYYY-MM-DD HH:mm:ss');
        label = 'last month';
        break;
      }
    }

    return {
      prevStartDate: prevStart,
      prevEndDate: prevEnd,
      comparisonLabel: label,
    };
  }, [filterPeriod, currentDate]);

  // Use React Query hook for transactions - data is cached and only refetches when invalidated
  const { data: transactions = [], isLoading, isFetching } = useTransactions(
    user?.id || '',
    { startDate, endDate }
  );

  // Previous period transactions for Total comparison
  const { data: previousTransactions = [] } = useTransactions(
    user?.id || '',
    { startDate: prevStartDate, endDate: prevEndDate }
  );

  // Remove duplicate transactions based on key fields (same logic as TransactionsListScreen)
  const deduplicatedTransactions = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    
    // Create a map to track unique transactions
    const seen = new Map<string, TransactionWithCategory>();
    let duplicateCount = 0;
    
    transactions.forEach((transaction) => {
      // Create a unique key based on: user_id, amount, occurred_at (date only), and raw_description
      // This helps identify duplicates even if they have different IDs
      const dateKey = moment(transaction.occurred_at).format('YYYY-MM-DD');
      // Normalize description to handle slight variations (trim, lowercase for comparison)
      const normalizedDescription = (transaction.raw_description || '').trim().toLowerCase();
      const uniqueKey = `${transaction.user_id}_${transaction.amount}_${dateKey}_${normalizedDescription}`;
      
      // If we haven't seen this transaction before, or if this one has a more recent created_at
      if (!seen.has(uniqueKey)) {
        seen.set(uniqueKey, transaction);
      } else {
        // If duplicate found, keep the one with the most recent created_at
        duplicateCount++;
        const existing = seen.get(uniqueKey)!;
        if (moment(transaction.created_at).isAfter(moment(existing.created_at))) {
          seen.set(uniqueKey, transaction);
        }
      }
    });
    
    if (duplicateCount > 0) {
      console.log(`⚠️ Dashboard: Removed ${duplicateCount} duplicate transaction(s)`);
    }
    
    return Array.from(seen.values());
  }, [transactions]);

  // Remove duplicates from previous period transactions as well
  const deduplicatedPreviousTransactions = useMemo(() => {
    if (!previousTransactions || previousTransactions.length === 0) return [];
    
    const seen = new Map<string, TransactionWithCategory>();
    
    previousTransactions.forEach((transaction) => {
      const dateKey = moment(transaction.occurred_at).format('YYYY-MM-DD');
      const normalizedDescription = (transaction.raw_description || '').trim().toLowerCase();
      const uniqueKey = `${transaction.user_id}_${transaction.amount}_${dateKey}_${normalizedDescription}`;
      
      if (!seen.has(uniqueKey)) {
        seen.set(uniqueKey, transaction);
      } else {
        const existing = seen.get(uniqueKey)!;
        if (moment(transaction.created_at).isAfter(moment(existing.created_at))) {
          seen.set(uniqueKey, transaction);
        }
      }
    });
    
    return Array.from(seen.values());
  }, [previousTransactions]);

  // Process transactions data for the UI (using deduplicated transactions)
  const processed = useMemo(() => {
    console.log('Processing transactions:', deduplicatedTransactions.length);
    if (deduplicatedTransactions.length === 0) {
      return {
        totalExpense: 0,
        totalIncome: 0,
        balance: 0,
        chartData: [],
        breakdown: []
      };
    }
    return processTransactionData(deduplicatedTransactions);
  }, [deduplicatedTransactions]);

  const processedIncome = useMemo(() => {
    // Filter income transactions (using deduplicated transactions)
    const incomeTransactions = deduplicatedTransactions.filter((tx) => tx.type === 'income');

    // Group income by category
    const categoryMap: CategoryMap = {};
    const totalIncome = incomeTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    incomeTransactions.forEach((tx) => {
      const category = tx.category_user || tx.category_ai;
      const categoryName = category?.name || 'Uncategorized';
      const categoryId = category?.id || 'uncategorized';
      const categoryIcon = category?.icon || '📦';

      if (!categoryMap[categoryId]) {
        categoryMap[categoryId] = {
          name: categoryName,
          amount: 0,
          icon: categoryIcon,
        };
      }
      categoryMap[categoryId].amount += Math.abs(tx.amount);
    });

    const sortedEntries = Object.entries(categoryMap)
      .sort((a, b) => b[1].amount - a[1].amount);

    const chartData = sortedEntries
      .map(([id, data], index) => ({
        value: data.amount,
        color: pieColors[index % pieColors.length],
        text: data.name,
      }));

    const breakdown = sortedEntries.map(([id, data], index) => ({
      name: data.name,
      amount: data.amount,
      percentage: totalIncome > 0 ? Math.round((data.amount / totalIncome) * 100) : 0,
      color: pieColors[index % pieColors.length],
      icon: data.icon,
      categoryId: id,
    }));

    return {
      chartData,
      breakdown,
      totalIncome
    };
  }, [deduplicatedTransactions]);

  const previousProcessed = useMemo(() => {
    if (deduplicatedPreviousTransactions.length === 0) {
      return {
        totalExpense: 0,
        totalIncome: 0,
        balance: 0,
      };
    }
    return processTransactionData(deduplicatedPreviousTransactions);
  }, [deduplicatedPreviousTransactions]);

  // const handleFilterChange = (period: FilterPeriod) => {
  //   setFilterPeriod(period);
  //   setCurrentDate(
  //     period === 'monthly' ? moment().startOf('month') : moment().startOf('week')
  //   );
  // };

  const handleNavigate = useCallback(
    (direction: 'prev' | 'next') => {
      const newDate = direction === 'prev'
        ? (filterPeriod === 'monthly'
          ? moment(currentDate).subtract(1, 'month').startOf('month')
          : filterPeriod === 'weekly'
            ? moment(currentDate).subtract(1, 'week').startOf('week')
            : filterPeriod === 'quarterly'
              ? moment(currentDate).subtract(1, 'quarter').startOf('quarter')
              : filterPeriod === 'yearly'
                ? moment(currentDate).subtract(1, 'year').startOf('year')
                : filterPeriod === 'half-yearly'
                  ? moment(currentDate).subtract(6, 'months')
                  : moment(currentDate).subtract(1, 'day').startOf('day'))
        : (filterPeriod === 'monthly'
          ? moment(currentDate).add(1, 'month').startOf('month')
          : filterPeriod === 'weekly'
            ? moment(currentDate).add(1, 'week').startOf('week')
            : filterPeriod === 'quarterly'
              ? moment(currentDate).add(1, 'quarter').startOf('quarter')
              : filterPeriod === 'yearly'
                ? moment(currentDate).add(1, 'year').startOf('year')
                : filterPeriod === 'half-yearly'
                  ? moment(currentDate).add(6, 'months')
                  : moment(currentDate).add(1, 'day').startOf('day'));

      // Update the shared filter context
      updateFilter(filterPeriod, newDate);
    },
    [filterPeriod, currentDate, updateFilter]
  );

  // Get the categories by amount
  const topCategories = useMemo(() => {
    return [...processed.breakdown]
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
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

  // Show full-screen loading only on initial load when there's no cached data
  // If data exists but is refetching, show the cached data (no loading screen)
  // Don't block on authReady if we have a user - allow transactions to load
  if ((!user || !authReady) && isLoading && deduplicatedTransactions.length === 0) {
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
      {/* Header with Date Navigation and Filter */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <DateNavigator
            currentDate={currentDate}
            onNavigate={handleNavigate}
            periodLabel={periodLabel}
            textColor="#ffffff"
            iconColor="#ffffff"
          />
          <View style={styles.filterButtonContainer}>
            <FilterMenu
              selectedPeriod={filterPeriod}
              onPeriodChange={handleFilterChange}
              iconColor="#ffffff"
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
          onTotalPress={() => setViewMode('total')}
          activeView={viewMode}
        />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>


        {/* Overview Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>
            {viewMode === 'expense'
              ? 'Expense Overview'
              : viewMode === 'income'
              ? 'Income Overview'
              : 'Total Overview'}
          </Text>

          {viewMode === 'total' ? (
            <TotalOverviewChart
              currentExpense={processed.totalExpense}
              currentIncome={processed.totalIncome}
              currentSavings={processed.balance}
              previousExpense={previousProcessed.totalExpense}
              previousIncome={previousProcessed.totalIncome}
              previousSavings={previousProcessed.balance}
              comparisonLabel={comparisonLabel}
            />
          ) : (viewMode === 'expense' ? processed.chartData : processedIncome.chartData).length > 0 ? (
            <ExpenseOverviewChart
              chartData={viewMode === 'expense' ? processed.chartData : processedIncome.chartData}
              totalExpense={viewMode === 'expense' ? processed.totalExpense : processedIncome.totalIncome}
              breakdown={viewMode === 'expense' ? topCategories : processedIncome.breakdown}
              transactions={viewMode === 'expense'
                ? deduplicatedTransactions.filter(tx => tx.type === 'expense')
                : deduplicatedTransactions.filter(tx => tx.type === 'income')
              }
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerContainer: {
    backgroundColor: '#007a33',
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
    marginTop: 1,
    paddingHorizontal: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 1,
    marginLeft: 4,
  },
  summaryContainer: {
    marginTop: 1,
    paddingHorizontal: 1,
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
    backgroundColor: '#f4f1e3',
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
