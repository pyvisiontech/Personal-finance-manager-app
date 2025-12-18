import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface TotalOverviewChartProps {
  currentExpense: number;
  currentIncome: number;
  currentSavings: number;
  previousExpense: number;
  previousIncome: number;
  previousSavings: number;
  comparisonLabel: string;
}

interface BarConfig {
  label: string;
  current: number;
  previous: number;
  currentColor: string;
  previousColor: string;
  signType: 'expense' | 'income' | 'savings';
}

export function TotalOverviewChart({
  currentExpense,
  currentIncome,
  currentSavings,
  previousExpense,
  previousIncome,
  previousSavings,
  comparisonLabel,
}: TotalOverviewChartProps) {
  const bars: BarConfig[] = [
    {
      label: 'Expense',
      current: Math.abs(currentExpense),
      previous: Math.abs(previousExpense),
      currentColor: '#F97373',
      previousColor: '#F97373', // Use same solid color as current
      signType: 'expense',
    },
    {
      label: 'Income',
      current: Math.abs(currentIncome),
      previous: Math.abs(previousIncome),
      currentColor: '#34D399',
      previousColor: '#34D399', // Use same solid color as current
      signType: 'income',
    },
    {
      label: 'Savings',
      current: Math.abs(currentSavings),
      previous: Math.abs(previousSavings),
      currentColor: '#60A5FA',
      previousColor: '#60A5FA', // Use same solid color as current
      signType: 'savings',
    },
  ];

  const allValues = bars.flatMap((b) => [Math.abs(b.current), Math.abs(b.previous)]);
  const maxValue = Math.max(...allValues, 1);

  const savingsDiff = currentSavings - previousSavings;
  const hasPreviousData =
    Math.abs(previousExpense) > 0 ||
    Math.abs(previousIncome) > 0 ||
    Math.abs(previousSavings) !== 0;

  let conclusion = 'Start tracking your spending to see insights here.';
  if (hasPreviousData) {
    const diffAbs = Math.abs(savingsDiff);
    if (diffAbs < 1) {
      conclusion = `Your savings are almost the same as ${comparisonLabel}.`;
    } else if (savingsDiff > 0) {
      conclusion = `You saved ₹${diffAbs.toLocaleString('en-IN')} more compared to ${comparisonLabel}.`;
    } else {
      conclusion = `You saved ₹${diffAbs.toLocaleString('en-IN')} less compared to ${comparisonLabel}.`;
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Current vs {comparisonLabel}</Text>

      <View style={styles.chartContainer}>
        {bars.map((bar) => {
          // Calculate width using absolute values - always show bars if there's a value
          let currentWidth = (Math.abs(bar.current) / maxValue) * 100;
          // Ensure minimum width to show at least one segment if value exists
          if (bar.current !== 0 && currentWidth < 1) {
            currentWidth = 1;
          }
          
          let previousWidth = (Math.abs(bar.previous) / maxValue) * 100;
          // Only for savings: if previous is negative, don't show the bar (width = 0)
          if (bar.signType === 'savings' && previousSavings < 0) {
            previousWidth = 0;
          } else {
            // Ensure minimum width to show at least one segment if value exists
            if (bar.previous !== 0 && previousWidth < 1) {
              previousWidth = 1;
            }
          }

          // Format current value with sign
          const formatCurrentValue = () => {
            if (bar.signType === 'expense') {
              return `-₹${bar.current.toLocaleString('en-IN')}`;
            } else if (bar.signType === 'income') {
              return `+₹${bar.current.toLocaleString('en-IN')}`;
            } else {
              // savings
              const sign = currentSavings >= 0 ? '+' : '-';
              return `${sign}₹${bar.current.toLocaleString('en-IN')}`;
            }
          };

          // Format previous value with sign
          const formatPreviousValue = () => {
            if (bar.signType === 'expense') {
              return `-₹${bar.previous.toLocaleString('en-IN')}`;
            } else if (bar.signType === 'income') {
              return `+₹${bar.previous.toLocaleString('en-IN')}`;
            } else {
              // savings
              const sign = previousSavings >= 0 ? '+' : '-';
              return `${sign}₹${bar.previous.toLocaleString('en-IN')}`;
            }
          };

          return (
            <View key={bar.label} style={styles.metricRow}>
              <View style={styles.metricLabelCol}>
                <Text style={styles.barLabel}>{bar.label}</Text>
              </View>

              <View style={styles.metricBarsCol}>
                {/* CURRENT PERIOD — SOLID */}
                <View style={styles.singleBarRow}>
                  <View style={styles.barTrack}>
                    {currentWidth > 0 && (
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${currentWidth}%`,
                            backgroundColor: bar.currentColor,
                          },
                        ]}
                      />
                    )}
                  </View>
                  <Text style={[styles.barValueText, styles.currentValueText]}>
                    {formatCurrentValue()}
                  </Text>
                </View>

                {/* PREVIOUS PERIOD — DOTTED WITH SOLID COLOR */}
                <View style={styles.singleBarRow}>
                  <View style={styles.barTrack}>
                    {previousWidth > 0 && (
                      <View
                        style={[
                          styles.segmentContainer,
                          { width: `${previousWidth}%` },
                        ]}
                      >
                        {Array.from({ length: 20 }).map((_, index) => (
                          <View
                            key={index}
                            style={[
                              styles.segment,
                              { backgroundColor: bar.previousColor },
                            ]}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                  <Text style={[styles.barValueText, styles.previousValueText]}>
                    {formatPreviousValue()}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={styles.legendBarContainer}>
            <View style={[styles.legendBarSolid, { backgroundColor: '#4B5563' }]} />
          </View>
          <Text style={styles.legendText}>Current period</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendBarContainer}>
            <View style={styles.legendBarDotted}>
              {Array.from({ length: 4 }).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.legendSegment,
                    { backgroundColor: '#4B5563' },
                  ]}
                />
              ))}
            </View>
          </View>
          <Text style={styles.legendText}>Previous period</Text>
        </View>
      </View>

      <View style={styles.conclusionContainer}>
        <Text style={styles.conclusionText}>{conclusion}</Text>
      </View>
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

  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  } as TextStyle,

  chartContainer: {
    marginBottom: 12,
  } as ViewStyle,

  barLabel: {
    fontSize: 12,
    color: '#4B5563',
  } as TextStyle,

  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  } as ViewStyle,

  metricLabelCol: {
    width: 70,
  } as ViewStyle,

  metricBarsCol: {
    flex: 1,
  } as ViewStyle,

  singleBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  } as ViewStyle,

  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 8,
  } as ViewStyle,

  barFill: {
    height: '100%',
    borderRadius: 4,
  } as ViewStyle,

  segmentContainer: {
    flexDirection: 'row',
    height: '100%',
    overflow: 'hidden',
  } as ViewStyle,

  segment: {
    width: 6,
    height: '100%',
    marginRight: 3,
    borderRadius: 2,
  } as ViewStyle,

  barValueText: {
    fontSize: 11,
    fontWeight: '500',
    width: 90,
    textAlign: 'right',
  } as TextStyle,

  currentValueText: {
    color: '#111827',
  } as TextStyle,

  previousValueText: {
    color: '#6B7280',
  } as TextStyle,

  legendRow: {
    flexDirection: 'row',
    marginBottom: 8,
  } as ViewStyle,

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  } as ViewStyle,

  legendBarContainer: {
    width: 24,
    height: 8,
    marginRight: 6,
    justifyContent: 'center',
  } as ViewStyle,

  legendBarSolid: {
    width: '100%',
    height: 8,
    borderRadius: 4,
  } as ViewStyle,

  legendBarDotted: {
    flexDirection: 'row',
    width: '100%',
    height: 8,
    alignItems: 'center',
  } as ViewStyle,

  legendSegment: {
    width: 4,
    height: 8,
    marginRight: 2,
    borderRadius: 2,
  } as ViewStyle,

  legendText: {
    fontSize: 11,
    color: '#6B7280',
  } as TextStyle,

  conclusionContainer: {
    marginTop: 4,
  } as ViewStyle,

  conclusionText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  } as TextStyle,
});
