import React from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle } from 'react-native';

export interface SpendingItem {
    name: string;
    amount: number;
    percentage: number;
    color: string;
}

interface SpendingBreakdownItemProps {
    item: SpendingItem;
}

export function SpendingBreakdownItem({ item }: SpendingBreakdownItemProps) {
    return (
        <View style={styles.itemContainer}>
            <View style={styles.itemHeader}>
                <View style={styles.itemNameContainer}>
                    <View
                        style={[styles.colorIndicator, { backgroundColor: item.color }]}
                    />
                    <Text style={styles.itemName}>{item.name}</Text>
                </View>
                <Text style={styles.percentage}>
                    {item.percentage}%
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
    );
}

const styles = StyleSheet.create({
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
        color: '#111827', // gray-900
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
});
