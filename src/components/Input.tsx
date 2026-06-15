import React, { useState } from 'react';
import { TextInput, View, Text, TextInputProps, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  className?: string;
  // When true, renders an eye icon to toggle password visibility.
  showPasswordToggle?: boolean;
}

export function Input({
  label,
  error,
  className,
  style,
  showPasswordToggle,
  secureTextEntry,
  ...props
}: InputProps) {
  const [isHidden, setIsHidden] = useState(true);
  const effectiveSecure = showPasswordToggle ? isHidden : secureTextEntry;

  return (
    <View className="mb-4" style={{ marginBottom: 16 }}>
      {label && (
        <Text className="text-sm font-semibold text-gray-800 mb-2" style={{ fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 8 }}>
          {label}
        </Text>
      )}
      <View style={{ position: 'relative', justifyContent: 'center' }}>
        <TextInput
          className={`border rounded-lg px-4 py-3 text-base bg-white ${error ? 'border-red-500' : 'border-gray-300'} ${className || ''}`}
          style={[
            {
              borderWidth: 1,
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 12,
              paddingRight: showPasswordToggle ? 48 : 16,
              fontSize: 16,
              backgroundColor: '#FFFFFF',
              borderColor: error ? '#EF4444' : '#D1D5DB',
            },
            style,
          ]}
          placeholderTextColor="#999"
          secureTextEntry={effectiveSecure}
          {...props}
        />
        {showPasswordToggle && (
          <TouchableOpacity
            onPress={() => setIsHidden((prev) => !prev)}
            style={{ position: 'absolute', right: 12, height: '100%', justifyContent: 'center', paddingHorizontal: 4 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={isHidden ? 'Show password' : 'Hide password'}
          >
            <Ionicons name={isHidden ? 'eye-off-outline' : 'eye-outline'} size={22} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text className="text-red-500 text-xs mt-1" style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>
          {error}
        </Text>
      )}
    </View>
  );
}
