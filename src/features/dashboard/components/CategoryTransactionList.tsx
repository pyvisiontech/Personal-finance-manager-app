import React, { useState } from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle, TouchableOpacity } from 'react-native';
import moment from 'moment';
import { Transaction } from '../../../lib/types';

interface TransactionWithCategory extends Transaction {
  category_user?: { id: string; name: string; icon?: string } | null;
  category_ai?: { id: string; name: string; icon?: string } | null;
}

interface CategoryTransactionListProps {
    transactions: (Transaction | TransactionWithCategory)[];
    categoryColor: string;
}

export function CategoryTransactionList({ transactions, categoryColor }: CategoryTransactionListProps) {
    if (transactions.length === 0) {
        return null;
    }

    const [showAll, setShowAll] = useState(false);

    // Sort transactions by absolute amount (descending - highest amount first)
    const sortedTransactions = [...transactions].sort((a, b) =>
        Math.abs(Number(b.amount)) - Math.abs(Number(a.amount))
    );

    const handleToggleShowAll = () => {
        setShowAll((prev) => !prev);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={[styles.indicatorLine, { backgroundColor: categoryColor }]} />
                    <Text style={styles.headerText}>Transactions ({transactions.length})</Text>
                </View>
            </View>
            {(showAll ? sortedTransactions : sortedTransactions.slice(0, 5)).map((transaction, index) => {
                // Always use occurred_at for date display (even if time is midnight, the date is still correct)
                // Only use created_at as fallback if occurred_at is missing
                const displayDate = transaction.occurred_at
                    ? moment(transaction.occurred_at)
                    : transaction.created_at
                    ? moment(transaction.created_at)
                    : moment();

                return (
                    <View key={transaction.id} style={styles.transactionItem}>
                        <View style={styles.transactionLeft}>
                            <Text style={styles.transactionDescription} numberOfLines={1}>
                                {transaction.merchant || transaction.raw_description || 'Transaction'}
                            </Text>
                            <Text style={styles.transactionDate}>
                                {displayDate.format('MMM D, YYYY • h:mm A')}
                            </Text>
                        </View>
                        <Text style={[
                            styles.transactionAmount,
                            transaction.amount < 0 ? styles.negative : styles.positive
                        ]}>
                            {transaction.amount < 0 ? '-' : '+'}₹{Math.abs(transaction.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </Text>
                    </View>
                );
            })}

            {sortedTransactions.length > 5 && !showAll && (
                <TouchableOpacity onPress={handleToggleShowAll} style={styles.showMoreRow}>
                    <Text style={styles.showMoreRowText}>Show More</Text>
                </TouchableOpacity>
            )}

            {sortedTransactions.length > 5 && showAll && (
                <TouchableOpacity onPress={handleToggleShowAll} style={styles.showMoreRow}>
                    <Text style={styles.showMoreRowText}>Show Less</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 8,
        marginBottom: 8,
        // Slightly reduce right margin so the transaction box is wider on the right side
        marginLeft: 16,
        marginRight: 2,
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        padding: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#e5e7eb',
    } as ViewStyle,
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        justifyContent: 'space-between',
    } as ViewStyle,
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    } as ViewStyle,
    indicatorLine: {
        width: 3,
        height: 16,
        borderRadius: 2,
        marginRight: 8,
    } as ViewStyle,
    headerText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    } as TextStyle,
    showMoreButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        backgroundColor: '#e5e7eb',
        marginLeft: 8,
    } as ViewStyle,
    showMoreText: {
        fontSize: 11,
        fontWeight: '500',
        color: '#111827',
    } as TextStyle,
    showMoreRow: {
        marginTop: 4,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
    } as ViewStyle,
    showMoreRowText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#2563eb',
    } as TextStyle,
    transactionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        backgroundColor: '#ffffff',
        borderRadius: 6,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    } as ViewStyle,
    transactionLeft: {
        flex: 1,
        marginRight: 12,
    } as ViewStyle,
    transactionDescription: {
        fontSize: 14,
        fontWeight: '500',
        color: '#111827',
        marginBottom: 4,
    } as TextStyle,
    transactionDate: {
        fontSize: 12,
        color: '#6b7280',
    } as TextStyle,
    transactionAmount: {
        fontSize: 14,
        fontWeight: '600',
    } as TextStyle,
    negative: {
        color: '#ef4444',
    } as TextStyle,
    positive: {
        color: '#22c55e',
    } as TextStyle,
});

