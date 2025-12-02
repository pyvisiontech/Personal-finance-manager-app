import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { useExpenseOverview } from '../hooks/useExpenseOverview';
import { useHasStatements } from '../hooks/useHasStatements';
import { useRecentTransactions } from '../hooks/useRecentTransactions';
import { useBudgetOverview } from '../hooks/useBudgetOverview';
import { ExpensePieChart } from '../components/ExpensePieChart';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';

export function DashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Check if user has uploaded statements
  const { data: hasStatements, isLoading: loadingStatements } = useHasStatements(user?.id || '');
  
  // Get selected month date range
  const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).toISOString();
  const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const { data: overview, isLoading: loadingOverview, error, refetch: refetchOverview } = useExpenseOverview(
    user?.id || '',
    startOfMonth,
    endOfMonth
  );

  const { data: recentTransactions, refetch: refetchTransactions } = useRecentTransactions(user?.id || '', 2);
  const { data: budgetOverview, refetch: refetchBudget } = useBudgetOverview(
    user?.id || '',
    startOfMonth,
    endOfMonth
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchOverview(),
      refetchTransactions(),
      refetchBudget(),
    ]);
    setRefreshing(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedDate(newDate);
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Show loading state
  if (loadingStatements || loadingOverview) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Loading dashboard...</Text>
      </View>
    );
  }

  // Show empty state for new users without statements
  if (!hasStatements) {
    return (
      <View className="flex-1 bg-gray-100">
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-4xl mb-4">📄</Text>
          <Text className="text-2xl font-bold text-gray-800 mb-3 text-center">
            Welcome to MyMoney!
          </Text>
          <Text className="text-base text-gray-600 mb-8 text-center px-4">
            Get started by uploading your first bank statement to see your financial overview.
          </Text>
          <Button
            title="Upload Bank Statement"
            onPress={() => navigation.navigate('UploadStatement')}
          />
        </View>
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-red-500 text-base mb-3">Error loading dashboard</Text>
        <TouchableOpacity onPress={() => refetchOverview()}>
          <Text className="text-blue-500 text-sm font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const netAmount = (overview?.total_income || 0) - (overview?.total_expense || 0);
  const totalAmount = netAmount;

  return (
    <View className="flex-1 bg-gray-100">
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View className="bg-white px-4 py-3 flex-row items-center justify-between border-b border-gray-200">
          <TouchableOpacity>
            <Text className="text-2xl">☰</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold" style={{ fontFamily: 'serif' }}>
            MyMoney
          </Text>
          <TouchableOpacity>
            <Text className="text-xl">🔍</Text>
          </TouchableOpacity>
        </View>

        <View className="p-4">
          {/* Monthly Financial Summary */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <TouchableOpacity onPress={() => navigateMonth('prev')}>
                <Text className="text-2xl text-gray-600">‹</Text>
              </TouchableOpacity>
              <Text className="text-lg font-semibold text-gray-800">
                {formatMonthYear(selectedDate)}
              </Text>
              <View className="flex-row items-center gap-3">
                <TouchableOpacity onPress={() => navigateMonth('next')}>
                  <Text className="text-2xl text-gray-600">›</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                  <Text className="text-lg">⚙️</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Three Column Summary */}
            <View className="flex-row gap-3">
              <Card className="flex-1 p-4">
                <Text className="text-xs text-gray-600 mb-1">EXPENSE</Text>
                <Text className="text-xl font-bold text-red-500">
                  ₹{overview?.total_expense.toLocaleString() || '0'}
                </Text>
              </Card>

              <Card className="flex-1 p-4">
                <Text className="text-xs text-gray-600 mb-1">INCOME</Text>
                <Text className="text-xl font-bold text-green-500">
                  ₹{overview?.total_income.toLocaleString() || '0'}
                </Text>
              </Card>

              <Card className="flex-1 p-4">
                <Text className="text-xs text-gray-600 mb-1">TOTAL</Text>
                <Text className="text-xl font-bold" style={{ color: totalAmount >= 0 ? '#34C759' : '#FF3B30' }}>
                  ₹{Math.abs(totalAmount).toLocaleString()}
                </Text>
              </Card>
            </View>
          </View>

          {/* Budget Overview */}
          <Card className="mb-4">
            <Text className="text-base font-semibold text-gray-800 mb-3">Budget Overview</Text>
            <View className="flex-row items-center gap-3">
              <View className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                <View
                  className="h-full bg-black rounded-full"
                  style={{ width: `${budgetOverview?.percentageUsed || 0}%` }}
                />
              </View>
              <Text className="text-sm font-medium text-gray-700">
                {Math.round(budgetOverview?.percentageUsed || 0)}% Used
              </Text>
            </View>
          </Card>

          {/* Spending Breakdown */}
          {overview && overview.categories.length > 0 && (
            <Card className="mb-4">
              <Text className="text-base font-semibold text-gray-800 mb-3">
                Spending Breakdown (Pie chart)
              </Text>
              <ExpensePieChart
                categories={overview.categories}
                totalExpense={overview.total_expense}
                showTitle={false}
              />
            </Card>
          )}

          {/* Recent Transactions */}
          <Card>
            <Text className="text-base font-semibold text-gray-800 mb-3">Recent Transactions</Text>
            {recentTransactions && recentTransactions.length > 0 ? (
              <View className="gap-3">
                {recentTransactions.map((transaction) => {
                  const category = transaction.category || { name: 'Uncategorized', icon: '📦' };
                  const amount = Number(transaction.amount);
                  const isExpense = transaction.type === 'expense';
                  const merchant = transaction.merchant || transaction.raw_description || 'Transaction';

                  return (
                    <View key={transaction.id} className="flex-row items-center justify-between py-2 border-b border-gray-100">
                      <View className="flex-row items-center flex-1">
                        <Text className="text-lg mr-2">{category.icon || '📦'}</Text>
                        <View className="flex-1">
                          <Text className="text-sm font-medium text-gray-800">{merchant}</Text>
                          <Text className="text-xs text-gray-500">{category.name}</Text>
                        </View>
                      </View>
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: isExpense ? '#FF3B30' : '#34C759' }}
                      >
                        {isExpense ? '-' : '+'}₹{Math.abs(amount).toLocaleString()}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text className="text-sm text-gray-500">No recent transactions</Text>
            )}
          </Card>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('UploadStatement')}
        activeOpacity={0.8}
      >
        <Text className="text-white text-3xl font-light">+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
