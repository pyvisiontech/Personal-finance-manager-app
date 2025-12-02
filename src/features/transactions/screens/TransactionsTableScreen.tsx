import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTransactions } from '../hooks/useTransactions';
import { useAuth } from '../../../context/AuthContext';
import { TransactionWithCategory } from '../../../lib/types';

export function TransactionsTableScreen() {
  const { user } = useAuth();
  const { data: transactions, isLoading } = useTransactions(user?.id || '');

  const formatAmount = (amount: number, type: string) => {
    const sign = type === 'income' ? '+' : '-';
    const color = type === 'income' ? '#34C759' : '#FF3B30';
    return { text: `${sign}₹${Math.abs(amount).toLocaleString()}`, color };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-base text-gray-600">No transactions found</Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal className="flex-1 bg-white">
      <View>
        <View className="flex-row bg-gray-100 py-3 px-2 border-b-2 border-gray-300">
          <Text className="font-semibold text-gray-800 text-sm w-[100px]">Date</Text>
          <Text className="font-semibold text-gray-800 text-sm w-[200px]">Description</Text>
          <Text className="font-semibold text-gray-800 text-sm w-[150px]">Category</Text>
          <Text className="font-semibold text-gray-800 text-sm w-[120px] text-right">Amount</Text>
          <Text className="font-semibold text-gray-800 text-sm w-[100px] text-center">Type</Text>
        </View>
        {transactions.map((transaction) => {
          const amount = formatAmount(Number(transaction.amount), transaction.type);
          const category = transaction.category || { name: 'Uncategorized', icon: '📦' };
          
          return (
            <View key={transaction.id} className="flex-row py-3 px-2 border-b border-gray-200">
              <Text className="text-sm text-gray-800 px-1 w-[100px]">
                {formatDate(transaction.occurred_at)}
              </Text>
              <Text className="text-sm text-gray-800 px-1 w-[200px]" numberOfLines={1}>
                {transaction.merchant || transaction.raw_description || 'Transaction'}
              </Text>
              <View className="px-1 w-[150px]">
                <Text className="text-sm text-gray-800">{category.icon} {category.name}</Text>
              </View>
              <Text className="text-sm font-semibold px-1 w-[120px] text-right" style={{ color: amount.color }}>
                {amount.text}
              </Text>
              <Text className="text-sm text-gray-800 px-1 w-[100px] text-center">
                {transaction.type}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
