import React from 'react';
import { View, Text } from 'react-native';
import { CategoryExpense } from '../../../lib/types';

interface ExpensePieChartProps {
  categories: CategoryExpense[];
  totalExpense: number;
  showTitle?: boolean;
}

export function ExpensePieChart({ categories, totalExpense, showTitle = true }: ExpensePieChartProps) {
  // Simple bar chart representation (you can replace with actual pie chart library later)
  const maxAmount = Math.max(...categories.map(c => c.total_amount), 1);

  return (
    <View className="p-4">
      {showTitle && (
        <Text className="text-lg font-semibold text-gray-800 mb-4">Expenses by Category</Text>
      )}
      <View className="gap-3">
        {categories.map((category) => {
          const percentage = (category.total_amount / totalExpense) * 100;
          const barWidth = (category.total_amount / maxAmount) * 100;

          return (
            <View key={category.category_id} className="mb-3">
              <View className="flex-row items-center mb-1.5">
                <Text className="text-2xl mr-3">{category.category_icon}</Text>
                <View className="flex-1">
                  <Text className="text-base font-medium text-gray-800">{category.category_name}</Text>
                  <Text className="text-sm text-gray-600 mt-0.5">
                    ₹{category.total_amount.toLocaleString()} ({percentage.toFixed(1)}%)
                  </Text>
                </View>
              </View>
              <View className="h-2 bg-gray-200 rounded overflow-hidden">
                <View className="h-full bg-blue-500 rounded" style={{ width: `${barWidth}%` }} />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
