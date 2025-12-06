import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Moment } from 'moment';

interface DateNavigatorProps {
  currentDate: Moment;
  onNavigate: (direction: 'prev' | 'next') => void;
  periodLabel: string;
}

export function DateNavigator({ currentDate, onNavigate, periodLabel }: DateNavigatorProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => onNavigate('prev')}
        style={styles.navButton}
      >
        <MaterialIcons name="chevron-left" size={24} color="#6B7280" />
      </TouchableOpacity>
      <Text style={styles.dateText}>
        {periodLabel}
      </Text>
      <TouchableOpacity
        onPress={() => onNavigate('next')}
        style={styles.navButton}
      >
        <MaterialIcons name="chevron-right" size={24} color="#6B7280" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    marginVertical: 2,
    flex: 1,
  } as ViewStyle,
  navButton: {
    padding: 8,
  } as ViewStyle,
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginHorizontal: 12,
    minWidth: 150,
    textAlign: 'center',
  } as TextStyle,
});
