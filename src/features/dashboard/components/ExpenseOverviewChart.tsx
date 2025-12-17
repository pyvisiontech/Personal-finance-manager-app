import React, { useState } from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

import { SpendingBreakdownItem, SpendingItem } from './SpendingBreakdownItem';
import { CategoryTransactionList } from './CategoryTransactionList';
import { Transaction, TransactionWithCategory } from '../../../lib/types';

interface ExpenseOverviewChartProps {
  chartData: {
    value: number;
    color: string;
    text: string;
  }[];
  totalExpense: number;
  breakdown: SpendingItem[];
  transactions?: TransactionWithCategory[];
}

export function ExpenseOverviewChart({ chartData, totalExpense, breakdown, transactions = [] }: ExpenseOverviewChartProps) {
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  const handleCategoryPress = (categoryId: string | undefined) => {
    if (!categoryId) return;
    setExpandedCategoryId(expandedCategoryId === categoryId ? null : categoryId);
  };

  const getCategoryTransactions = (categoryId: string | undefined) => {
    if (!categoryId || !transactions) return [];
    return transactions.filter((tx) => {
      const category = tx.category_user || tx.category_ai;
      // Handle uncategorized case
      if (categoryId === 'uncategorized') {
        return !tx.category_user && !tx.category_ai;
      }
      return category && category.id === categoryId;
    });
  };
  return (
    <View style={styles.container}>


      {chartData.length > 0 ? (
        <View>
          <View style={styles.chartRow}>
            <View style={styles.pieChartContainer}>
              <PieChart
                data={chartData}
                donut
                innerRadius={50}
                radius={80}
                showText={false}
                focusOnPress
                centerLabelComponent={() => (
                  <View style={styles.centerLabel}>
                    <Text style={styles.centerLabelText}>Expenses</Text>
                  </View>
                )}
              />
            </View>

            {/* Side Legend */}
            <View style={styles.sideLegendContainer}>
              {breakdown.map((item, index) => (
                <View key={index} style={styles.legendItem}>
                  <View style={[styles.legendIndicator, { backgroundColor: item.color }]} />
                  <Text style={styles.legendText} numberOfLines={1} ellipsizeMode="tail">
                    {item.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Legend */}
          <View style={styles.legendContainer}>
            {breakdown.map((item, index) => {
              const categoryId = item.categoryId;
              const isExpanded = expandedCategoryId === categoryId;
              const categoryTransactions = getCategoryTransactions(categoryId);

              return (
                <View key={index}>
                  <SpendingBreakdownItem 
                    item={item} 
                    onPress={() => handleCategoryPress(categoryId)}
                    expanded={isExpanded}
                  />
                  {isExpanded && categoryTransactions.length > 0 && (
                    <CategoryTransactionList 
                      transactions={categoryTransactions}
                      categoryColor={item.color}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </View>
      ) : (
        <Text style={styles.emptyText}>No expenses this period</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  } as ViewStyle,

  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  } as ViewStyle,

  chartContainer: {
    alignItems: 'center',
  } as ViewStyle,
  pieChartContainer: {
    position: 'relative',
    height: 200,
    width: 200,
    // height: 160,
    // width: 160,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  centerLabelText: {
    fontSize: 14,
    color: '#6B7280',
  } as TextStyle,
  centerLabelAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 4,
  } as TextStyle,
  legendContainer: {
    width: '100%',
  } as ViewStyle,
  sideLegendContainer: {
    flex: 1,
    marginLeft: 20,
    justifyContent: 'center',
  } as ViewStyle,
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  } as ViewStyle,
  legendIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  } as ViewStyle,
  legendText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  } as TextStyle,

  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    paddingVertical: 32,
  } as TextStyle,
});
