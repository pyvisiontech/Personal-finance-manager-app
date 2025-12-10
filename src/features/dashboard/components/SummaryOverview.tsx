import React from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle, TouchableOpacity } from 'react-native';

interface SummaryOverviewProps {
  totalExpense: number;
  totalIncome: number;
  balance: number;
  onExpensePress?: () => void;
  onIncomePress?: () => void;
  activeView?: 'expense' | 'income';
}

export function SummaryOverview({
  totalExpense,
  totalIncome,
  balance,
  onExpensePress,
  onIncomePress,
  activeView = 'expense'
}: SummaryOverviewProps) {
  const displayExpense = Math.abs(totalExpense);
  const displayIncome = Math.abs(totalIncome);
  const displayBalance = Math.abs(balance);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.column, activeView === 'expense' && styles.activeColumn]}
        onPress={onExpensePress}
        activeOpacity={0.7}
      >
        <Text style={[styles.label, activeView === 'expense' && styles.activeLabel]}>Expense</Text>
        <Text style={[styles.amount, styles.expense]}>
          ₹{displayExpense.toLocaleString('en-IN')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.column, activeView === 'income' && styles.activeColumn]}
        onPress={onIncomePress}
        activeOpacity={0.7}
      >
        <Text style={[styles.label, activeView === 'income' && styles.activeLabel]}>Income</Text>
        <Text style={[styles.amount, styles.income]}>
          ₹{displayIncome.toLocaleString('en-IN')}
        </Text>
      </TouchableOpacity>

      <View style={styles.column}>
        <Text style={styles.label}>Total</Text>
        <Text style={[styles.amount, balance < 0 ? styles.expense : styles.income]}>
          ₹{displayBalance.toLocaleString('en-IN')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginVertical: 16,
  } as ViewStyle,
  column: {
    alignItems: 'center',
  } as ViewStyle,
  activeColumn: {
    opacity: 1,
  } as ViewStyle,
  label: {
    fontSize: 14,
    color: '#6B7280', // gray-500
    marginBottom: 4,
  } as TextStyle,
  activeLabel: {
    color: '#111827', // gray-900
    fontWeight: '600',
  } as TextStyle,
  amount: {
    fontSize: 18,
    fontWeight: '700',
  } as TextStyle,
  expense: {
    color: '#F43F5E', // rose-500
  } as TextStyle,
  income: {
    color: '#10B981', // emerald-500
  } as TextStyle,
});
