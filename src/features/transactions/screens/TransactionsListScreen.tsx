import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { useTransactions } from '../hooks/useTransactions';
import { useAuth } from '../../../context/AuthContext';
import { useFilter } from '../../../context/FilterContext';
import { TransactionWithCategory } from '../../../lib/types';
import { FilterMenu, FilterPeriod } from '../../dashboard/components/FilterMenu';
import { DateNavigator } from '../../dashboard/components/DateNavigator';
import { SummaryOverview } from '../../dashboard/components/SummaryOverview';
import { RootStackParamList } from '../../../navigation/types';
import moment from 'moment';
import FloatingActionButton from '../../dashboard/components/FloatingActionButton';

interface DateGroup {
  date: string;
  displayDate: string;
  transactions: TransactionWithCategory[];
  totalAmount: number;
}

export function TransactionsListScreen() {
  const { user } = useAuth();
  const { filterPeriod: dashboardFilterPeriod, currentDate: dashboardCurrentDate } = useFilter();
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  // Use Dashboard filter as default, but allow local override
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>(dashboardFilterPeriod);
  const [currentDate, setCurrentDate] = useState<moment.Moment>(dashboardCurrentDate);
  const [hasLocalOverride, setHasLocalOverride] = useState(false);
  const [viewMode, setViewMode] = useState<'expense' | 'income' | 'total'>('expense');
  const [sortMode, setSortMode] = useState<'date' | 'amount'>('date');
  const [isSortMenuVisible, setIsSortMenuVisible] = useState(false);

  // Sync with Dashboard filter when it changes (only if user hasn't overridden locally)
  useEffect(() => {
    if (!hasLocalOverride) {
      setFilterPeriod(dashboardFilterPeriod);
      setCurrentDate(dashboardCurrentDate.clone());
    }
  }, [dashboardFilterPeriod, dashboardCurrentDate, hasLocalOverride]);

  // Reset to Dashboard filter when screen comes into focus
  // This ensures users always see transactions based on Dashboard filter by default
  useFocusEffect(
    useCallback(() => {
      // Reset local override when screen gains focus
      setHasLocalOverride(false);
      setFilterPeriod(dashboardFilterPeriod);
      setCurrentDate(dashboardCurrentDate.clone());
    }, [dashboardFilterPeriod, dashboardCurrentDate])
  );

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

  const { data: transactions = [], isLoading, error, refetch } = useTransactions(
    user?.id || '',
    { startDate, endDate }
  );

  // Remove duplicate transactions based on key fields
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
      console.log(`⚠️ Removed ${duplicateCount} duplicate transaction(s)`);
    }
    
    return Array.from(seen.values());
  }, [transactions]);

  const handleEditTransaction = (transaction: TransactionWithCategory) => {
    navigation.navigate('ManualTransaction', { transaction });
  };

  const handleFilterChange = (period: FilterPeriod) => {
    setFilterPeriod(period);
    setHasLocalOverride(true); // Mark that user has overridden the filter
    const now = moment();
    setCurrentDate(
      period === 'monthly' ? now.startOf('month') :
        period === 'weekly' ? now.startOf('week') :
          period === 'quarterly' ? now.startOf('quarter') :
            period === 'yearly' ? now.startOf('year') :
              period === 'half-yearly' ? (now.month() < 6 ? now.startOf('year') : now.startOf('year').add(6, 'months')) :
                now.startOf('day')
    );
  };

  const handleNavigate = useCallback(
    (direction: 'prev' | 'next') => {
      setHasLocalOverride(true); // Mark that user has overridden the date
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

      setCurrentDate(newDate);
    },
    [filterPeriod, currentDate]
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Filter transactions based on viewMode (using deduplicated transactions)
  const filteredTransactions = useMemo(() => {
    if (!deduplicatedTransactions) return [];
    
    if (viewMode === 'expense') {
      return deduplicatedTransactions.filter(tx => tx.type === 'expense');
    } else if (viewMode === 'income') {
      return deduplicatedTransactions.filter(tx => tx.type === 'income');
    }
    // For 'total', return all transactions (but we'll show chart instead)
    return deduplicatedTransactions;
  }, [deduplicatedTransactions, viewMode]);

  // Group transactions by date (only when sorting by date)
  const dateGroups = useMemo(() => {
    if (!filteredTransactions || filteredTransactions.length === 0) return [];
    
    // When sorting by amount, don't group by date - return empty array
    if (sortMode === 'amount') {
      return [];
    }

    const groups = new Map<string, DateGroup>();

    filteredTransactions.forEach((transaction) => {
      const date = moment(transaction.occurred_at).format('YYYY-MM-DD');
      const displayDate = moment(transaction.occurred_at).format('MMM DD, dddd');

      if (!groups.has(date)) {
        groups.set(date, {
          date,
          displayDate,
          transactions: [],
          totalAmount: 0,
        });
      }

      const group = groups.get(date)!;
      group.transactions.push(transaction);
      group.totalAmount += Number(transaction.amount);
    });

    // Sort transactions within each group by time (ascending - chronological order, oldest first)
    const processedGroups = Array.from(groups.values())
      .map(group => {
        const sortedTransactions = [...group.transactions].sort((a, b) => 
          moment(a.occurred_at).valueOf() - moment(b.occurred_at).valueOf()
        );
        
        return {
          ...group,
          transactions: sortedTransactions,
        };
      });
    
    // Sort date groups by date (descending - most recent first)
    return processedGroups.sort((a, b) => 
      moment(b.date).valueOf() - moment(a.date).valueOf()
    );
  }, [filteredTransactions, sortMode]);

  // Sort all transactions by amount when sortMode is 'amount' (no date grouping)
  const sortedTransactionsByAmount = useMemo(() => {
    if (sortMode !== 'amount' || !filteredTransactions || filteredTransactions.length === 0) {
      return [];
    }
    
    // Sort all transactions by amount in descending order (highest first)
    return [...filteredTransactions].sort((a, b) =>
      Math.abs(Number(b.amount)) - Math.abs(Number(a.amount))
    );
  }, [filteredTransactions, sortMode]);

  const formatAmount = (amount: number, type: string) => {
    const sign = type === 'income' ? '+' : '-';
    const color = type === 'income' ? '#34C759' : '#FF3B30';
    const abs = Math.abs(amount);
    const formatted = abs.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    return { text: `${sign}₹${formatted}`, color };
  };

  const formatDateShort = (dateString: string) => {
    return moment(dateString).format('MMM DD, YYYY');
  };

  const getCategoryIcon = (transaction: TransactionWithCategory) => {
    const category = transaction.category_user || transaction.category_ai || transaction.category;
    return category?.icon || '📦';
  };

  const getCategoryName = (transaction: TransactionWithCategory) => {
    const category = transaction.category_user || transaction.category_ai || transaction.category;
    return category?.name || 'Uncategorized';
  };

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

  // Calculate summary totals from deduplicated transactions
  const summaryTotals = useMemo(() => {
    if (!deduplicatedTransactions || deduplicatedTransactions.length === 0) {
      return {
        totalExpense: 0,
        totalIncome: 0,
        balance: 0,
      };
    }

    const expenseTransactions = deduplicatedTransactions.filter((tx) => tx.type === 'expense');
    const incomeTransactions = deduplicatedTransactions.filter((tx) => tx.type === 'income');

    const totalExpense = expenseTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const totalIncome = incomeTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const balance = totalIncome - totalExpense;

    return {
      totalExpense,
      totalIncome,
      balance,
    };
  }, [deduplicatedTransactions]);

  const getPeriodDisplayName = (period: FilterPeriod) => {
    switch (period) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      case 'quarterly': return '3 Months';
      case 'half-yearly': return '6 Months';
      case 'yearly': return 'Yearly';
      default: return 'Monthly';
    }
  };

  const renderTransaction = (transaction: TransactionWithCategory, isLast: boolean = false, showDate: boolean = false) => {
    const amount = formatAmount(Number(transaction.amount), transaction.type);
    const categoryName = getCategoryName(transaction);
    const categoryIcon = getCategoryIcon(transaction);
    const description =
      transaction.merchant || transaction.raw_description || categoryName || 'Transaction';

    return (
      <TouchableOpacity
        key={transaction.id}
        onPress={() => handleEditTransaction(transaction)}
        activeOpacity={0.7}
        style={[styles.transactionItem, isLast && styles.lastTransactionItem]}
      >
        <View style={styles.transactionLeft}>
          <View style={styles.categoryIconContainer}>
            <Text style={styles.categoryIcon}>{categoryIcon}</Text>
          </View>
          <View style={styles.transactionDetails}>
            <View style={styles.nameRow}>
              <Text
                style={styles.categoryName}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {description}
              </Text>
            </View>
            {showDate && (
              <Text style={styles.transactionDate}>
                {moment(transaction.occurred_at).format('MMM DD, YYYY')}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.transactionRight}>
          <Text style={[styles.amount, { color: amount.color }]}>
            {amount.text}
          </Text>
          <TouchableOpacity
            style={styles.editIconButton}
            onPress={(e) => {
              e.stopPropagation();
              handleEditTransaction(transaction);
            }}
          >
            <MaterialIcons name="edit" size={18} color="#2563eb" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSortBar = () => {
    // Show sort bar if there are transactions, regardless of sort mode
    if (!filteredTransactions || filteredTransactions.length === 0) return null;
    return (
      <View style={[
        styles.sortBarFixed,
        isSortMenuVisible && styles.sortBarFixedExpanded
      ]}>
        <View style={styles.sortControlInline}>
          <MaterialIcons
            name="filter-list"
            size={16}
            color="#4b5563"
            style={styles.sortIcon}
          />
          <Text style={styles.sortLabel}>Sort by:</Text>
          <TouchableOpacity
            style={styles.sortSelector}
            onPress={() => setIsSortMenuVisible((prev) => !prev)}
            activeOpacity={0.8}
          >
            <Text style={styles.sortSelectorText}>
              {sortMode === 'date' ? 'Date' : 'Amount'}
            </Text>
            <MaterialIcons
              name={isSortMenuVisible ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={16}
              color="#4b5563"
            />
          </TouchableOpacity>
        </View>
        {isSortMenuVisible && (
          <View style={styles.sortMenuDropdown}>
            <TouchableOpacity
              style={styles.sortMenuItem}
              onPress={() => {
                setSortMode('date');
                setIsSortMenuVisible(false);
              }}
            >
              <View style={styles.sortMenuItemLeft}>
                {sortMode === 'date' && (
                  <MaterialIcons name="check" size={16} color="#007a33" />
                )}
                <Text
                  style={[
                    styles.sortMenuItemText,
                    sortMode === 'date' && styles.sortMenuItemTextActive,
                  ]}
                >
                  Date
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sortMenuItem}
              onPress={() => {
                setSortMode('amount');
                setIsSortMenuVisible(false);
              }}
            >
              <View style={styles.sortMenuItemLeft}>
                {sortMode === 'amount' && (
                  <MaterialIcons name="check" size={16} color="#007a33" />
                )}
                <Text
                  style={[
                    styles.sortMenuItemText,
                    sortMode === 'amount' && styles.sortMenuItemTextActive,
                  ]}
                >
                  Amount
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderDateGroup = (group: DateGroup) => {
    return (
      <View key={group.date} style={styles.dateGroup}>
        <View style={styles.dateHeaderRow}>
          <Text style={styles.dateHeader}>{group.displayDate}</Text>
        </View>
        <View style={styles.transactionsList}>
          {group.transactions.map((transaction, index) =>
            renderTransaction(transaction, index === group.transactions.length - 1, false)
          )}
        </View>
      </View>
    );
  };

  const renderFlatTransactionList = () => {
    if (!sortedTransactionsByAmount || sortedTransactionsByAmount.length === 0) {
      return null;
    }

    return (
      <View style={styles.dateGroup}>
        <View style={styles.transactionsList}>
          {sortedTransactionsByAmount.map((transaction, index) =>
            renderTransaction(transaction, index === sortedTransactionsByAmount.length - 1, true)
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => {
    const viewModeText = viewMode === 'expense' ? 'expenses' : viewMode === 'income' ? 'income' : 'transactions';
    return (
      <View style={styles.emptyStateContainer}>
        <View style={styles.emptyStateCard}>
          <View style={styles.emptyIconContainer}>
            <Text style={styles.emptyIcon}>📊</Text>
          </View>
          <Text style={styles.emptyTitle}>No {viewModeText} found</Text>
          <Text style={styles.emptySubtitle}>
            No {viewModeText} for the {getPeriodDisplayName(filterPeriod).toLowerCase()} period
          </Text>
          <View style={styles.periodBadge}>
            <Text style={styles.periodBadgeText}>{periodLabel}</Text>
          </View>
          <View style={styles.emptyActionContainer}>
            <View style={styles.emptyHintContainer}>
              <Text style={styles.emptyHintIcon}>💡</Text>
              <Text style={styles.emptyHintText}>
                Use the filter button in the header to change the period
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Render header with DateNavigator and FilterMenu
  const renderHeader = () => (
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
  );

  if (isLoading && !refreshing) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    console.error('Error loading transactions:', error);
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error loading transactions</Text>
          <Text style={styles.errorMessage}>
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  console.log('Transactions data:', { transactions, isLoading, error });

  return (
    <View style={styles.container}>
      {renderHeader()}
      <SummaryOverview
        totalExpense={summaryTotals.totalExpense}
        totalIncome={summaryTotals.totalIncome}
        balance={summaryTotals.balance}
        onExpensePress={() => setViewMode('expense')}
        onIncomePress={() => setViewMode('income')}
        onTotalPress={() => setViewMode('total')}
        activeView={viewMode}
      />
      {filteredTransactions && filteredTransactions.length > 0 && renderSortBar()}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          (!filteredTransactions || filteredTransactions.length === 0) && styles.scrollContentEmpty,
          isSortMenuVisible && styles.scrollContentWithMenu,
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {!filteredTransactions || filteredTransactions.length === 0 ? (
          renderEmptyState()
        ) : sortMode === 'amount' ? (
          renderFlatTransactionList()
        ) : (
          dateGroups.map((group) => renderDateGroup(group))
        )}
      </ScrollView>
      <FloatingActionButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f1e3',
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8, // Reduce top padding to minimize gap between sort filter and transactions
  },
  scrollContentWithMenu: {
    paddingTop: 60, // Add space when dropdown menu is visible to prevent overlap
  },
  chartContainer: {
    paddingHorizontal: 8,
  },
  sortBarFixed: {
    backgroundColor: '#f4f1e3',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4, // Add small bottom padding for better spacing
    alignItems: 'flex-end',
    zIndex: 10,
  },
  sortBarFixedExpanded: {
    paddingBottom: 8,
  },
  sortControlInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sortMenuDropdown: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
    paddingVertical: 4,
    minWidth: 120,
    zIndex: 20,
  },
  dateGroup: {
    marginTop: 8, // Reduce top margin to minimize gap
    marginBottom: 24,
  },
  firstDateGroup: {
    marginBottom: 24,
  },
  dateHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dateHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  transactionsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  lastTransactionItem: {
    borderBottomWidth: 0,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryIcon: {
    fontSize: 20,
  },
  transactionDetails: {
    flex: 1,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  transactionDate: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  inlineActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  editIconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
    backgroundColor: 'transparent',
    marginLeft: 8,
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  paymentMethod: {
    fontSize: 12,
    color: '#6b7280',
  },
  transactionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amount: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 60,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  periodBadge: {
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  periodBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
    textAlign: 'center',
  },
  emptyActionContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  emptyHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0F2FE',
    width: '100%',
  },
  emptyHintIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  emptyHintText: {
    flex: 1,
    fontSize: 14,
    color: '#0369A1',
    lineHeight: 20,
  },
  sortIcon: {
    marginRight: 4,
  },
  sortLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 4,
  },
  sortSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#f9fafb',
  },
  sortSelectorText: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '600',
    marginRight: 2,
  },
  sortMenuItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sortMenuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortMenuItemText: {
    fontSize: 14,
    color: '#111827',
  },
  sortMenuItemTextActive: {
    fontWeight: '600',
    color: '#007a33',
  },
});
