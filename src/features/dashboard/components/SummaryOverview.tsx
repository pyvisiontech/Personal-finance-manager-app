import React from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle } from 'react-native';

interface SummaryOverviewProps {
  totalExpense: number;
  totalIncome: number;
  balance: number;
}

export function SummaryOverview({ totalExpense, totalIncome, balance }: SummaryOverviewProps) {
  return (
    <View style={styles.container}>
      <View style={styles.column}>
        <Text style={styles.label}>Expense</Text>
        <Text style={[styles.amount, styles.expense]}>
          ₹{Math.abs(totalExpense).toLocaleString('en-IN')}
        </Text>
      </View>
      <View style={styles.column}>
        <Text style={styles.label}>Income</Text>
        <Text style={[styles.amount, styles.income]}>
          ₹{Math.abs(totalIncome).toLocaleString('en-IN')}
        </Text>
      </View>
      <View style={styles.column}>
        <Text style={styles.label}>Total</Text>
        <Text style={[styles.amount, balance < 0 ? styles.expense : styles.income]}>
          ₹{Math.abs(balance).toLocaleString('en-IN')}
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
  label: {
    fontSize: 14,
    color: '#6B7280', // gray-500
    marginBottom: 4,
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
