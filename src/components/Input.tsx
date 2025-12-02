import React from 'react';
import { TextInput, View, Text, TextInputProps, StyleSheet } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  className?: string;
}

export function Input({ label, error, className, style, ...props }: InputProps) {
  return (
    <View className="mb-4" style={{ marginBottom: 16 }}>
      {label && (
        <Text className="text-sm font-semibold text-gray-800 mb-2" style={{ fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 8 }}>
          {label}
        </Text>
      )}
      <TextInput
        className={`border rounded-lg px-4 py-3 text-base bg-white ${error ? 'border-red-500' : 'border-gray-300'} ${className || ''}`}
        style={[
          {
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 12,
            fontSize: 16,
            backgroundColor: '#FFFFFF',
            borderColor: error ? '#EF4444' : '#D1D5DB',
          },
          style,
        ]}
        placeholderTextColor="#999"
        {...props}
      />
      {error && (
        <Text className="text-red-500 text-xs mt-1" style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>
          {error}
        </Text>
      )}
    </View>
  );
}
