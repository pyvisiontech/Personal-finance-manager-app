import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export type FilterPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';

interface FilterMenuProps {
  selectedPeriod: FilterPeriod;
  onPeriodChange: (period: FilterPeriod) => void;
  iconColor?: string;
}

export function FilterMenu({ selectedPeriod, onPeriodChange, iconColor = '#4F46E5' }: FilterMenuProps) {
  const [showMenu, setShowMenu] = React.useState(false);

  const periods: { label: string; value: FilterPeriod }[] = [
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
    { label: '3 Months', value: 'quarterly' },
    { label: '6 Months', value: 'half-yearly' },
    { label: 'Yearly', value: 'yearly' },
  ];

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setShowMenu(true)}
      >
        <MaterialIcons name="filter-list" size={24} color={iconColor} />
      </TouchableOpacity>

      <Modal
        transparent={true}
        visible={showMenu}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer} onStartShouldSetResponder={() => true}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Select Period</Text>
              <TouchableOpacity onPress={() => setShowMenu(false)}>
                <MaterialIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {periods.map((period) => (
              <TouchableOpacity
                key={period.value}
                style={[
                  styles.menuItem,
                  selectedPeriod === period.value && styles.selectedMenuItem,
                ]}
                onPress={() => {
                  onPeriodChange(period.value);
                  setShowMenu(false);
                }}
              >
                <Text
                  style={[
                    styles.menuItemText,
                    selectedPeriod === period.value && styles.selectedMenuItemText,
                  ]}
                >
                  {period.label}
                </Text>
                {selectedPeriod === period.value && (
                  <MaterialIcons name="check" size={20} color="#4F46E5" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  filterButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 300,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  selectedMenuItem: {
    backgroundColor: '#F5F3FF',
  },
  menuItemText: {
    fontSize: 16,
    color: '#374151',
  },
  selectedMenuItemText: {
    color: '#4F46E5',
    fontWeight: '500',
  },
});
