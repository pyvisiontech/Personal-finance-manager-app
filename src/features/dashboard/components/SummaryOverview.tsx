import React from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle, TouchableOpacity } from 'react-native';

interface SummaryOverviewProps {
  totalExpense: number;
  totalIncome: number;
  balance: number;
  onExpensePress?: () => void;
  onIncomePress?: () => void;
  onTotalPress?: () => void;
  activeView?: 'expense' | 'income' | 'total';
}

export function SummaryOverview({
  totalExpense,
  totalIncome,
  balance,
  onExpensePress,
  onIncomePress,
  onTotalPress,
  activeView = 'expense',
}: SummaryOverviewProps) {
  const displayExpense = Math.abs(totalExpense);
  const displayIncome = Math.abs(totalIncome);
  const displayBalance = Math.abs(balance);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          activeView === 'expense' ? styles.activeButton : styles.inactiveButton,
        ]}
        onPress={onExpensePress}
        activeOpacity={0.8}
      >
        <View style={styles.buttonContent}>
          <Text style={[
            styles.label,
            activeView === 'expense' ? styles.activeLabel : styles.inactiveLabel
          ]}>
            Expense
          </Text>
          <Text style={[styles.amount, styles.expense]}>
            -₹{displayExpense.toLocaleString('en-IN')}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          activeView === 'income' ? styles.activeButton : styles.inactiveButton,
        ]}
        onPress={onIncomePress}
        activeOpacity={0.8}
      >
        <View style={styles.buttonContent}>
          <Text style={[
            styles.label,
            activeView === 'income' ? styles.activeLabel : styles.inactiveLabel
          ]}>
            Income
          </Text>
          <Text style={[styles.amount, styles.income]}>
            +₹{displayIncome.toLocaleString('en-IN')}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          activeView === 'total' ? styles.activeButton : styles.inactiveButton,
        ]}
        onPress={onTotalPress}
        activeOpacity={0.8}
      >
        <View style={styles.buttonContent}>
          <Text style={[
            styles.label,
            activeView === 'total' ? styles.activeLabel : styles.inactiveLabel
          ]}>
            Total
          </Text>
          <Text style={[styles.amount, balance < 0 ? styles.expense : styles.income]}>
            {balance < 0 ? '-' : '+'}₹{displayBalance.toLocaleString('en-IN')}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginVertical: 12,
    gap: 6,
  } as ViewStyle,
  button: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  } as ViewStyle,
  activeButton: {
    backgroundColor: '#F3F4F6', // light gray background when active
    borderColor: '#111827', // dark border when active
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  } as ViewStyle,
  inactiveButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB', // light gray border when inactive
  } as ViewStyle,
  buttonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  label: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '500',
  } as TextStyle,
  activeLabel: {
    color: '#111827', // dark text when active
    fontWeight: '600',
  } as TextStyle,
  inactiveLabel: {
    color: '#6B7280', // gray text when inactive
  } as TextStyle,
  amount: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 0,
  } as TextStyle,
  expense: {
    color: '#F43F5E', // rose-500
  } as TextStyle,
  income: {
    color: '#10B981', // emerald-500
  } as TextStyle,
});
