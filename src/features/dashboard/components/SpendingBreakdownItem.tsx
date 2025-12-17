import React from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle, TouchableOpacity } from 'react-native';

export interface SpendingItem {
    name: string;
    amount: number;
    percentage: number;
    color: string;
    icon?: string;
    categoryId?: string; // Add categoryId to identify the category
}

interface SpendingBreakdownItemProps {
    item: SpendingItem;
    onPress?: () => void;
    expanded?: boolean;
}

export function SpendingBreakdownItem({ item, onPress, expanded }: SpendingBreakdownItemProps) {
    return (
        <View style={styles.wrapperContainer}>
            <TouchableOpacity 
                style={styles.itemContainer}
                onPress={onPress}
                activeOpacity={0.7}
            >
                {/* Left Section: Icon */}
                <View style={styles.iconContainer}>
                    <Text style={styles.icon}>{item.icon || '📦'}</Text>
                </View>

                {/* Right Section: Details */}
                <View style={styles.detailsContainer}>
                    {/* Header: Name and Amount */}
                    <View style={styles.headerRow}>
                        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                        <Text style={[
                            styles.amountText,
                            item.amount < 0 ? styles.negative : styles.positive
                        ]}>
                            {item.amount < 0 ? '-' : '+'}₹{Math.abs(item.amount).toLocaleString('en-IN')}
                        </Text>
                    </View>

                    {/* Progress Bar - Clickable area */}
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

                    {/* Footer: Percentage */}
                    <View style={styles.footerRow}>
                        <Text style={styles.percentageText}>
                            {item.percentage}%
                        </Text>
                        {expanded !== undefined && (
                            <Text style={styles.expandIcon}>
                                {expanded ? '▼' : '▶'}
                            </Text>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapperContainer: {
        marginBottom: 16,
    } as ViewStyle,
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    } as ViewStyle,
    iconContainer: {
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
        width: 40,
    } as ViewStyle,
    icon: {
        fontSize: 28, // Bigger icon
    } as TextStyle,
    detailsContainer: {
        flex: 1,
    } as ViewStyle,
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    } as ViewStyle,
    itemName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        flex: 1,
        marginRight: 8,
    } as TextStyle,
    amountText: {
        fontSize: 14,
        fontWeight: '600',
    } as TextStyle,
    progressBarContainer: {
        height: 8,
        backgroundColor: '#F3F4F6', // gray-100
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: -12,
    } as ViewStyle,
    progressBar: {
        height: '100%',
        borderRadius: 3,
    } as ViewStyle,
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 8,
    } as ViewStyle,
    percentageText: {
        fontSize: 10,
        color: '#000', // gray-500
        fontWeight: 'bold',
    } as TextStyle,
    expandIcon: {
        fontSize: 10,
        color: '#6b7280',
    } as TextStyle,
    negative: {
        color: '#ef4444', // red-500
    } as TextStyle,
    positive: {
        color: '#22c55e', // green-500
    } as TextStyle,
});
