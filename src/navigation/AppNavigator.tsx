import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { SignUpScreen } from '../features/auth/screens/SignUpScreen';
import DashboardScreen from '../features/dashboard/screens/DashboardScreen';
import { TransactionsListScreen } from '../features/transactions/screens/TransactionsListScreen';
import { TransactionsTableScreen } from '../features/transactions/screens/TransactionsTableScreen';
import ManualTransactionScreen from '../features/transactions/screens/ManualTransactionScreen';

import { UploadStatementScreen } from '../features/statements/screens/UploadStatementScreen';
import { View, Text } from 'react-native';

const Stack = createNativeStackNavigator();

function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}

function MainNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#007AFF' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Stack.Screen
        name="Transactions"
        component={TransactionsListScreen}
        options={{ title: 'Transactions' }}
      />
      <Stack.Screen
        name="TransactionsTable"
        component={TransactionsTableScreen}
        options={{ title: 'Table View' }}
      />
      <Stack.Screen
        name="UploadStatement"
        component={UploadStatementScreen}
        options={{ title: 'Upload Statement' }}
      />
      <Stack.Screen
      name="ManualTransaction"
      component={ManualTransactionScreen}
      options={{ title: 'Add Transaction' }}
/>
    </Stack.Navigator>
  );
}

export function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
