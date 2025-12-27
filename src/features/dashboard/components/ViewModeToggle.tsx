import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type ViewMode = 'me' | 'groups';

interface ViewModeToggleProps {
  selectedMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

export function ViewModeToggle({ selectedMode, onModeChange }: ViewModeToggleProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, selectedMode === 'me' && styles.buttonActive]}
        onPress={() => onModeChange('me')}
      >
        <Text style={[styles.buttonText, selectedMode === 'me' && styles.buttonTextActive]}>
          Me
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, selectedMode === 'groups' && styles.buttonActive]}
        onPress={() => onModeChange('groups')}
      >
        <Text style={[styles.buttonText, selectedMode === 'groups' && styles.buttonTextActive]}>
          Groups
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 2,
    marginRight: 16,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  buttonActive: {
    backgroundColor: '#ffffff',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonTextActive: {
    color: '#007a33',
  },
});

