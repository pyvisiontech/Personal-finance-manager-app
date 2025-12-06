import React from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle } from 'react-native';

interface SpendingItem {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

interface SpendingBreakdownListProps {
  items: SpendingItem[];
}

export function SpendingBreakdownList({ items }: SpendingBreakdownListProps) {
  return (
    <View style={styles.container}>


      {items.length > 0 ? (
        <View>
          {items.map((item, index) => (
            <View key={index} style={styles.itemContainer}>
              <View style={styles.itemHeader}>
                <View style={styles.itemNameContainer}>
                  <View
                    style={[styles.colorIndicator, { backgroundColor: item.color }]}
                  />
                  <Text style={styles.itemName}>{item.name}</Text>
                </View>
                <Text style={styles.percentage}>
                  -{item.percentage}%
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${Math.min(item.percentage, 100)}%`,
                      backgroundColor: item.color,
                    }
                  ]}
                />
              </View>
              <View style={styles.amountContainer}>
                <Text style={styles.amount}>
                  ₹{item.amount.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>No spending data available</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginTop: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  } as ViewStyle,

  itemContainer: {
    marginBottom: 16,
  } as ViewStyle,
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  } as ViewStyle,
  itemNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  } as ViewStyle,
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  } as TextStyle,
  percentage: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F43F5E', // rose-500
  } as TextStyle,
  progressBarContainer: {
    height: 6,
    backgroundColor: '#F3F4F6', // gray-100
    borderRadius: 3,
    overflow: 'hidden',
  } as ViewStyle,
  progressBar: {
    height: '100%',
    borderRadius: 3,
  } as ViewStyle,
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 2,
  } as ViewStyle,
  amount: {
    fontSize: 12,
    color: '#6B7280', // gray-500
  } as TextStyle,
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    paddingVertical: 16,
  } as TextStyle,
});
