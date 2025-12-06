import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { useAuth } from '../../../context/AuthContext';

const styles = {
  featureContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
    marginBottom: 30,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
    padding: 10,
  },
  featureIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureIconText: {
    fontSize: 24,
  },
  featureText: {
    fontSize: 12,
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 4,
  },
} as const;

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
      style={{ flex: 1, backgroundColor: '#f5f5dc' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center p-5"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
      >
        <View style={{ marginBottom: 40, alignItems: 'center' }}>
          <Text style={{ fontSize: 28, fontWeight: '700', color: '#2C3E50', marginBottom: 12, textAlign: 'center' }}>
            Welcome to Finance Tracker
          </Text>
          <Text style={{ fontSize: 16, color: '#4B5563', textAlign: 'center', marginBottom: 32, lineHeight: 24, paddingHorizontal: 20 }}>
            Take control of your finances and achieve your financial goals with our powerful money management tools.
          </Text>
          
          <View style={styles.featureContainer}>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>💰</Text>
              </View>
              <Text style={styles.featureText}>Track Expenses</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>📈</Text>
              </View>
              <Text style={styles.featureText}>Monitor Budgets</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>🎯</Text>
              </View>
              <Text style={styles.featureText}>Reach Goals</Text>
            </View>
          </View>
          
          <Text style={{ 
            fontSize: 20, 
            fontWeight: '600', 
            color: '#2C3E50', 
            marginTop: 40,
            marginBottom: 20 
          }}>
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
