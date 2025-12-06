import React from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

import { SpendingBreakdownItem, SpendingItem } from './SpendingBreakdownItem';

interface ExpenseOverviewChartProps {
  chartData: {
    value: number;
    color: string;
    text: string;
  }[];
  totalExpense: number;
  breakdown: SpendingItem[];
}

export function ExpenseOverviewChart({ chartData, totalExpense, breakdown }: ExpenseOverviewChartProps) {
  return (
    <View style={styles.container}>


      {chartData.length > 0 ? (
        <View style={styles.chartContainer}>
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
                  {/* <Text style={styles.centerLabelAmount}>
                    ₹{totalExpense.toLocaleString('en-IN')}
                  </Text> */}
                </View>
              )}
            />
          </View>

          {/* Legend */}
          <View style={styles.legendContainer}>
            {breakdown.map((item, index) => (
              <SpendingBreakdownItem key={index} item={item} />
            ))}
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
    marginVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  } as ViewStyle,

  chartContainer: {
    alignItems: 'center',
  } as ViewStyle,
  pieChartContainer: {
    position: 'relative',
    height: 200,
    width: 200,
    marginBottom: 8,
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
    marginTop: 24,
  } as ViewStyle,

  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    paddingVertical: 32,
  } as TextStyle,
});
