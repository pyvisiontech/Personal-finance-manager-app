import React from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

interface ChartData {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

interface ExpenseOverviewChartProps {
  chartData: {
    value: number;
    color: string;
    text: string;
  }[];
  totalExpense: number;
  breakdown: ChartData[];
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
              <View key={index} style={styles.legendItem}>
                <View
                  style={[styles.legendColor, { backgroundColor: item.color }]}
                />
                <Text style={styles.legendName}>{item.name}</Text>
                <Text style={styles.legendPercentage}>
                  {item.percentage}%
                </Text>
              </View>
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
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  } as ViewStyle,
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  } as ViewStyle,
  legendName: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  } as TextStyle,
  legendPercentage: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  } as TextStyle,
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    paddingVertical: 32,
  } as TextStyle,
});
