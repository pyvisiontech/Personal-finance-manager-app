import React, { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import moment from 'moment';
import { useLayoutEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import FloatingActionButton from '../../dashboard/components/FloatingActionButton';


// Types
import { TransactionWithCategory } from '../../../lib/types';

// Components
import { DateNavigator } from '../../dashboard/components/DateNavigator';
import { FilterMenu, FilterPeriod } from '../../dashboard/components/FilterMenu';
import { SummaryOverview } from '../../dashboard/components/SummaryOverview';
import { ExpenseOverviewChart } from '../../dashboard/components/ExpenseOverviewChart';
import { TotalOverviewChart } from '../../dashboard/components/TotalOverviewChart';

// Hooks
import { useFilter } from '../../../context/FilterContext';
import { useGroupTransactions } from '../hooks/useGroupTransactions';
import { useGroupMembers } from '../hooks/useGroups';
import { RootStackParamList } from '../../../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type GroupDashboardRouteProp = RouteProp<RootStackParamList, 'GroupDashboard'>;
type GroupDashboardNavigationProp = NativeStackNavigationProp<RootStackParamList, 'GroupDashboard'>;

interface ProcessedData {
  totalExpense: number;
  totalIncome: number;
  balance: number;
  chartData: Array<{ value: number; color: string; text: string }>;
  breakdown: Array<{ name: string; amount: number; percentage: number; color: string; icon?: string }>;
}

const pieColors = [
  '#3B82F6', '#F97316', '#10B981', '#EC4899', '#8B5CF6', '#F59E0B',
  '#06B6D4', '#EF4444', '#84CC16', '#6366F1', '#14B8A6', '#D946EF',
  '#0EA5E9', '#EAB308', '#64748B',
];

interface CategoryMap {
  [key: string]: {
    name: string;
    amount: number;
    icon?: string;
  };
}

function processTransactionData(transactions: TransactionWithCategory[]): ProcessedData {
  const expenseTransactions = transactions.filter((tx) => tx.type === 'expense');
  const incomeTransactions = transactions.filter((tx) => tx.type === 'income');

  const totalExpense = expenseTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const totalIncome = incomeTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const balance = totalIncome - totalExpense;

  const categoryMap: CategoryMap = {};

  expenseTransactions.forEach((tx) => {
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
    amount: -data.amount,
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

export function GroupDashboardScreen() {
  const route = useRoute<GroupDashboardRouteProp>();
  const navigation = useNavigation<GroupDashboardNavigationProp>();
  const { groupId, groupName } = route.params;
  const { filterPeriod, currentDate, updateFilter } = useFilter();
  const [viewMode, setViewMode] = useState<'expense' | 'income' | 'total'>('expense');
  const { data: members = [] } = useGroupMembers(groupId);

  useLayoutEffect(() => {
    // Add invite member button to header
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateGroup', { groupId, groupName })}
          style={{ marginRight: 16 }}
        >
          <Ionicons name="person-add" size={24} color="#ffffff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, groupId, groupName]);

  const handleFilterChange = useCallback((period: FilterPeriod) => {
    const now = moment();
    const newDate = period === 'monthly' ? now.startOf('month') :
      period === 'weekly' ? now.startOf('week') :
        period === 'quarterly' ? now.startOf('quarter') :
          period === 'yearly' ? now.startOf('year') :
            period === 'half-yearly' ? (now.month() < 6 ? now.startOf('year') : now.startOf('year').add(6, 'months')) :
              now.startOf('day');

    updateFilter(period, newDate);
  }, [updateFilter]);

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
        return moment(currentDate).format('YYYY-MM-DD HH:mm:ss');
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

  const { data: transactions = [], isLoading } = useGroupTransactions(groupId, {
    startDate,
    endDate,
  });

  // Previous period transactions for Total comparison
  const { data: previousTransactions = [] } = useGroupTransactions(groupId, {
    startDate: prevStartDate,
    endDate: prevEndDate,
  });

  const deduplicatedTransactions = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    
    const seen = new Map<string, TransactionWithCategory>();
    
    transactions.forEach((transaction) => {
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

  const processed = useMemo(() => {
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
    // Filter income transactions
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

      updateFilter(filterPeriod, newDate);
    },
    [filterPeriod, currentDate, updateFilter]
  );

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

  const topCategories = useMemo(() => {
    return [...processed.breakdown]
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  }, [processed.breakdown]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007a33" />
        <Text style={styles.loadingText}>Loading group transactions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
        {/* Group Members Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.membersHeader}>
            <Text style={styles.sectionTitle}>Group Members ({members.length})</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('CreateGroup', { groupId, groupName })}
              style={styles.inviteButton}
            >
              <Ionicons name="person-add" size={18} color="#007a33" />
              <Text style={styles.inviteButtonText}>Invite</Text>
            </TouchableOpacity>
          </View>
          {members.length > 0 ? (
            <View style={styles.membersList}>
              {members.map((member, index) => (
                <View 
                  key={member.id} 
                  style={[
                    styles.memberItem,
                    index === members.length - 1 && styles.memberItemLast
                  ]}
                >
                  <View style={styles.memberAvatar}>
                    <Ionicons name="person" size={20} color="#007a33" />
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {member.user?.first_name && member.user?.last_name
                        ? `${member.user.first_name} ${member.user.last_name}`
                        : member.user?.email || 'Unknown User'}
                    </Text>
                    <Text style={styles.memberEmail}>{member.user?.email || ''}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyMembers}>
              <Text style={styles.emptyMembersText}>No members yet</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('CreateGroup', { groupId, groupName })}
                style={styles.inviteEmptyButton}
              >
                <Ionicons name="person-add" size={16} color="#007a33" />
                <Text style={styles.inviteEmptyButtonText}>Invite First Member</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Transactions Overview Section */}
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
          ) : viewMode === 'income' ? (
            // Income View
            processedIncome.chartData.length > 0 ? (
              <ExpenseOverviewChart
                chartData={processedIncome.chartData}
                totalExpense={processedIncome.totalIncome}
                breakdown={processedIncome.breakdown}
                transactions={deduplicatedTransactions.filter(tx => tx.type === 'income')}
              />
            ) : (
              <View style={[styles.emptyState, styles.chartPlaceholder]}>
                <View style={styles.placeholderCircle} />
                <Text style={[styles.emptyStateText, { marginTop: 16 }]}>
                  No income recorded
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  {filterPeriod === 'daily'
                    ? 'No income for this day'
                    : filterPeriod === 'weekly'
                      ? 'No income for this week'
                      : 'No income for this month'}
                </Text>
              </View>
            )
          ) : (
            // Expense View (default)
            processed.chartData.length > 0 ? (
              <ExpenseOverviewChart
                chartData={processed.chartData}
                totalExpense={processed.totalExpense}
                breakdown={topCategories}
                transactions={deduplicatedTransactions.filter(tx => tx.type === 'expense')}
              />
            ) : (
              <View style={[styles.emptyState, styles.chartPlaceholder]}>
                <View style={styles.placeholderCircle} />
                <Text style={[styles.emptyStateText, { marginTop: 16 }]}>
                  No transactions recorded
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  {filterPeriod === 'daily'
                    ? 'No expenses for this day'
                    : filterPeriod === 'weekly'
                      ? 'No expenses for this week'
                      : 'No expenses for this month'}
                </Text>
              </View>
            )
          )}
        </View>
      </ScrollView>
      <FloatingActionButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f1e3',
    position: 'relative',
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
  summaryContainer: {
    marginTop: 1,
    paddingHorizontal: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f1e3',
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
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  membersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e6f5f0',
    borderRadius: 8,
  },
  inviteButtonText: {
    color: '#007a33',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  membersList: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  memberItemLast: {
    borderBottomWidth: 0,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e6f5f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyMembers: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  emptyMembersText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  inviteEmptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#e6f5f0',
    borderRadius: 8,
  },
  inviteEmptyButtonText: {
    color: '#007a33',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
});

