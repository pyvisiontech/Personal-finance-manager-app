import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { useAuth } from '../../../context/AuthContext';

export function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      // Navigation will be handled by auth state change
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-100"
      style={{ flex: 1, backgroundColor: '#F3F4F6' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center p-5"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
      >
        <View className="mb-10 items-center" style={{ marginBottom: 40, alignItems: 'center' }}>
          <Text className="text-3xl font-bold text-gray-800 mb-2" style={{ fontSize: 30, fontWeight: '700', color: '#1F2937', marginBottom: 8 }}>
            Welcome Back
          </Text>
          <Text className="text-base text-gray-600" style={{ fontSize: 16, color: '#4B5563' }}>
            Sign in to continue
          </Text>
        </View>

        <View className="w-full" style={{ width: '100%' }}>
          <Input
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
          />

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
          />

          <View className="flex-row justify-center mt-5" style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20 }}>
            <Text className="text-gray-600 text-sm" style={{ color: '#4B5563', fontSize: 14 }}>
              Don't have an account?{' '}
            </Text>
            <Text
              className="text-blue-500 text-sm font-semibold"
              style={{ color: '#3B82F6', fontSize: 14, fontWeight: '600' }}
              onPress={() => navigation.navigate('SignUp')}
            >
              Sign Up
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
