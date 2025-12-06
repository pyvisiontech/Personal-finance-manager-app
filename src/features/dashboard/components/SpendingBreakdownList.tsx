import { View, Text, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { SpendingBreakdownItem, SpendingItem } from './SpendingBreakdownItem';



interface SpendingBreakdownListProps {
  items: SpendingItem[];
}

export function SpendingBreakdownList({ items }: SpendingBreakdownListProps) {
  return (
    <View style={styles.container}>


      {items.length > 0 ? (
        <View>
          {items.map((item, index) => (
            <SpendingBreakdownItem key={index} item={item} />
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



  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    paddingVertical: 16,
  } as TextStyle,
});
