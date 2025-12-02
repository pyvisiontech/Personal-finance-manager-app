import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useTransactions } from '../hooks/useTransactions';
import { useAuth } from '../../../context/AuthContext';
import { TransactionWithCategory } from '../../../lib/types';
import { Card } from '../../../components/Card';

export function TransactionsListScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const { data: transactions, isLoading, error, refetch } = useTransactions(user?.id || '');

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formatAmount = (amount: number, type: string) => {
    const sign = type === 'income' ? '+' : '-';
    const color = type === 'income' ? '#34C759' : '#FF3B30';
    return { text: `${sign}₹${Math.abs(amount).toLocaleString()}`, color };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (isLoading && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center p-5">
        <Text>Loading transactions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center p-5">
        <Text className="text-red-500 text-base mb-3">Error loading transactions</Text>
        <TouchableOpacity onPress={() => refetch()}>
          <Text className="text-blue-500 text-sm font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <View className="flex-1 justify-center items-center p-5">
        <Text className="text-lg font-semibold text-gray-800 mb-2">No transactions found</Text>
        <Text className="text-sm text-gray-600">Upload a bank statement to get started</Text>
      </View>
    );
  }

  const renderTransaction = ({ item }: { item: TransactionWithCategory }) => {
    const amount = formatAmount(Number(item.amount), item.type);
    const category = item.category || { name: 'Uncategorized', icon: '📦' };

    return (
      <Card className="mb-3">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center flex-1">
            <Text className="text-2xl mr-3">{category.icon || '📦'}</Text>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-800 mb-1">
                {item.merchant || item.raw_description || 'Transaction'}
              </Text>
              <Text className="text-sm text-gray-600">{category.name}</Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-base font-semibold mb-1" style={{ color: amount.color }}>
              {amount.text}
            </Text>
            <Text className="text-xs text-gray-500">{formatDate(item.occurred_at)}</Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View className="flex-1 bg-gray-100">
      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        contentContainerClassName="p-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
}
