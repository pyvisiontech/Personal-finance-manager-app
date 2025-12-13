import React from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle, TouchableOpacity } from 'react-native';

interface SummaryOverviewProps {
  totalExpense: number;
  totalIncome: number;
  balance: number;
  onExpensePress?: () => void;
  onIncomePress?: () => void;
  activeView?: 'expense' | 'income';
  showUnderline?: boolean;
}

export function SummaryOverview({
  totalExpense,
  totalIncome,
  balance,
  onExpensePress,
  onIncomePress,
  activeView = 'expense',
  showUnderline = true
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
        <View style={styles.labelContainer}>
          <Text style={[styles.label, activeView === 'expense' && styles.activeLabel]}>Expense</Text>
          {showUnderline && activeView === 'expense' && <View style={styles.underline} />}
        </View>
        <Text style={[styles.amount, styles.expense]}>
          -₹{displayExpense.toLocaleString('en-IN')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.column, activeView === 'income' && styles.activeColumn]}
        onPress={onIncomePress}
        activeOpacity={0.7}
      >
        <View style={styles.labelContainer}>
          <Text style={[styles.label, activeView === 'income' && styles.activeLabel]}>Income</Text>
          {showUnderline && activeView === 'income' && <View style={styles.underline} />}
        </View>
        <Text style={[styles.amount, styles.income]}>
          +₹{displayIncome.toLocaleString('en-IN')}
        </Text>
      </TouchableOpacity>

      <View style={styles.column}>
        <Text style={styles.label}>Total</Text>
        <Text style={[styles.amount, balance < 0 ? styles.expense : styles.income]}>
          {balance < 0 ? '-' : '+'}₹{displayBalance.toLocaleString('en-IN')}
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
  labelContainer: {
    alignItems: 'center',
    marginBottom: 4,
  } as ViewStyle,
  label: {
    fontSize: 14,
    color: '#6B7280', // gray-500
  } as TextStyle,
  activeLabel: {
    color: '#111827', // gray-900
    fontWeight: '600',
  } as TextStyle,
  underline: {
    position: 'absolute',
    bottom: -4,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#111827', // gray-900
    borderRadius: 1,
  } as ViewStyle,
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
