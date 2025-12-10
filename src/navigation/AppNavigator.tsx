import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { SignUpScreen } from '../features/auth/screens/SignUpScreen';
import DashboardScreen from '../features/dashboard/screens/DashboardScreen';
import { WelcomeScreen } from '../features/onboarding/screens/WelcomeScreen';
import { TransactionsListScreen } from '../features/transactions/screens/TransactionsListScreen';
import { TransactionsTableScreen } from '../features/transactions/screens/TransactionsTableScreen';
import ManualTransactionScreen from '../features/transactions/screens/ManualTransactionScreen';

import { UploadStatementScreen } from '../features/statements/screens/UploadStatementScreen';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const RootStack = createNativeStackNavigator();
const HomeStack = createNativeStackNavigator();
const TransactionsStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AuthNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Login" component={LoginScreen} />
      <RootStack.Screen name="SignUp" component={SignUpScreen} />
    </RootStack.Navigator>
  );
}

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#007AFF' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <HomeStack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <HomeStack.Screen
        name="UploadStatement"
        component={UploadStatementScreen}
        options={{ title: 'Upload Statement' }}
      />
    </HomeStack.Navigator>
  );
}

function TransactionsStackNavigator() {
  return (
    <TransactionsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#007AFF' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <TransactionsStack.Screen
        name="TransactionsList"
        component={TransactionsListScreen}
        options={{ title: 'Transactions' }}
      />
      <TransactionsStack.Screen
        name="TransactionsTable"
        component={TransactionsTableScreen}
        options={{ title: 'Table View' }}
      />
      <TransactionsStack.Screen
        name="ManualTransaction"
        component={ManualTransactionScreen}
        options={{ title: 'Add Transaction' }}
      />
    </TransactionsStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0f2d25',
        tabBarInactiveTintColor: '#6b7a72',
        tabBarStyle: {
          backgroundColor: '#f4f1e3',
          borderTopColor: '#d8d2b8',
          height: 68,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="TransactionsTab"
        component={TransactionsStackNavigator}
        options={{
          tabBarLabel: 'Transactions',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="list-outline" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function OnboardingNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Welcome" component={WelcomeScreen} />
    </RootStack.Navigator>
  );
}

export function AppNavigator() {
  const { user, loading, needsProfileCompletion } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Loading...</Text>
      </View>
    );
  }

  // Use a key that changes based on auth state to force React Navigation to reset
  // This prevents navigation errors when switching between auth and main navigators
  const navigationKey = user 
    ? (needsProfileCompletion ? 'onboarding' : 'main') 
    : 'auth';

  return (
    <NavigationContainer key={navigationKey}>
      {user ? (needsProfileCompletion ? <OnboardingNavigator /> : <MainTabs />) : <AuthNavigator />}
    </NavigationContainer>
  );
}