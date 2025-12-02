import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
} from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'outline';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  className,
  style,
  ...touchableProps
}: ButtonProps) {
  const baseClasses = 'py-3.5 px-6 rounded-lg items-center justify-center min-h-[50px]';
  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-blue-500',
    secondary: 'bg-purple-600',
    outline: 'bg-transparent border border-blue-500',
  };
  const textClasses: Record<ButtonVariant, string> = {
    primary: 'text-white',
    secondary: 'text-white',
    outline: 'text-blue-500',
  };
  const disabledClasses = disabled || loading ? 'opacity-50' : '';

  // Fallback styles if NativeWind doesn't work
  const buttonStyles: Record<ButtonVariant, ViewStyle> = {
    primary: {
      backgroundColor: '#3B82F6',
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 50,
      opacity: disabled || loading ? 0.5 : 1,
    },
    secondary: {
      backgroundColor: '#9333EA',
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 50,
      opacity: disabled || loading ? 0.5 : 1,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: '#3B82F6',
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 50,
      opacity: disabled || loading ? 0.5 : 1,
    },
  };

  const textStyles: Record<ButtonVariant, TextStyle> = {
    primary: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
    secondary: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
    outline: { color: '#3B82F6', fontSize: 16, fontWeight: '600' },
  };

  return (
    <TouchableOpacity
      className={`${baseClasses} ${variantClasses[variant]} ${disabledClasses} ${className || ''}`}
      style={[buttonStyles[variant], style]}
      onPress={onPress}
      disabled={disabled || loading}
      {...touchableProps}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#007AFF' : '#fff'} />
      ) : (
        <Text className={`text-base font-semibold ${textClasses[variant]}`} style={textStyles[variant]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
