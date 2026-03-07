import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { useGroupContext } from '../context/GroupContext';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { SignUpScreen } from '../features/auth/screens/SignUpScreen';
import DashboardScreen from '../features/dashboard/screens/DashboardScreen';
import { WelcomeScreen } from '../features/onboarding/screens/WelcomeScreen';
import { TransactionsListScreen } from '../features/transactions/screens/TransactionsListScreen';
import { TransactionsTableScreen } from '../features/transactions/screens/TransactionsTableScreen';
import ManualTransactionScreen from '../features/transactions/screens/ManualTransactionScreen';

import { UploadStatementScreen } from '../features/statements/screens/UploadStatementScreen';
import { StatementsListScreen } from '../features/statements/screens/StatementsListScreen';
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';
import { GroupsListScreen } from '../features/groups/screens/GroupsListScreen';
import { CreateGroupScreen } from '../features/groups/screens/CreateGroupScreen';
import { GroupDetailsScreen } from '../features/groups/screens/GroupDetailsScreen';
import { NotificationsScreen } from '../features/notifications/screens/NotificationsScreen';
import { FAQScreen } from '../features/faq/screens/FAQScreen';
import { FeedbackScreen } from '../features/feedback/screens/FeedbackScreen';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, HomeStackParamList, TransactionsStackParamList, StatementsStackParamList, OnboardingStackParamList } from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const TransactionsStack = createNativeStackNavigator<TransactionsStackParamList>();
const StatementsStack = createNativeStackNavigator<StatementsStackParamList>();
const GroupDetailsStack = createNativeStackNavigator<HomeStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
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
        headerStyle: { backgroundColor: '#007a33' },
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
      <HomeStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="GroupsList"
        component={GroupsListScreen}
        options={{ title: 'Groups' }}
      />
      <HomeStack.Screen
        name="CreateGroup"
        component={CreateGroupScreen}
        options={({ route }: { route: RouteProp<HomeStackParamList, 'CreateGroup'> }) => ({
          title: route.params?.groupName ? 'Invite Member' : 'Create Group',
        })}
      />
      <HomeStack.Screen
        name="GroupDetails"
        component={GroupDetailsScreen}
        options={{ title: 'Group Details' }}
      />
      <HomeStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <HomeStack.Screen
        name="FAQ"
        component={FAQScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="Feedback"
        component={FeedbackScreen}
        options={{ headerShown: false }}
      />
    </HomeStack.Navigator>
  );
}

function TransactionsStackNavigator() {
  return (
    <TransactionsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#007a33' },
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
        options={({ route }: { route: RouteProp<TransactionsStackParamList, 'ManualTransaction'> }) => ({
          title: route.params?.transaction ? 'Edit Transaction' : 'Add Transaction',
        })}
      />
      <TransactionsStack.Screen
        name="UploadStatement"
        component={UploadStatementScreen}
        options={{ title: 'Upload Statement' }}
      />
    </TransactionsStack.Navigator>
  );
}

function StatementsStackNavigator() {
  return (
    <StatementsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#007a33' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <StatementsStack.Screen
        name="StatementsList"
        component={StatementsListScreen}
        options={{ headerShown: false }}
      />
      <StatementsStack.Screen
        name="UploadStatement"
        component={UploadStatementScreen}
        options={{ title: 'Upload Statement' }}
      />
    </StatementsStack.Navigator>
  );
}

function GroupDetailsStackNavigator() {
  return (
    <GroupDetailsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#007a33' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <GroupDetailsStack.Screen
        name="GroupDetails"
        component={GroupDetailsScreen}
        options={{ title: 'Group Details' }}
      />
      <GroupDetailsStack.Screen
        name="CreateGroup"
        component={CreateGroupScreen}
        options={({ route }: { route: RouteProp<HomeStackParamList, 'CreateGroup'> }) => ({
          title: route.params?.groupName ? 'Invite Member' : 'Create Group',
        })}
      />
    </GroupDetailsStack.Navigator>
  );
}

function MainTabs() {
  const { isGroupsMode } = useGroupContext();

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
          marginBottom: 8,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
            <Ionicons name={focused ? "home" : "home-outline"} color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="TransactionsTab"
        component={TransactionsStackNavigator}
        options={{
          tabBarLabel: 'Transactions',
          tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
            <Ionicons name={focused ? "list" : "list-outline"} color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="StatementsTab"
        component={StatementsStackNavigator}
        options={{
          tabBarLabel: 'Statements',
          tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
            <Ionicons name={focused ? "document-text" : "document-text-outline"} color={color} size={size} />
          ),
        }}
      />
      {isGroupsMode && (
        <Tab.Screen
          name="GroupDetailsTab"
          component={GroupDetailsStackNavigator}
          options={{
            tabBarLabel: 'Group Details',
            tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
              <Ionicons name={focused ? "people" : "people-outline"} color={color} size={size} />
            ),
          }}
        />
      )}
    </Tab.Navigator>
  );
}

function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="Welcome" component={WelcomeScreen} />
    </OnboardingStack.Navigator>
  );
}

export function AppNavigator() {
  const { user, loading, needsProfileCompletion } = useAuth();

  // Only block on the initial bootstrap when no user is present.
  // If a user exists, render immediately to avoid a stuck loading screen.
  if (loading && !user) {
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

  console.log('AppNavigator State:', {
    hasUser: !!user,
    userId: user?.id,
    loading,
    needsProfileCompletion,
    navigationKey
  });

  return (
    <NavigationContainer key={navigationKey}>
      {user ? (needsProfileCompletion ? <OnboardingNavigator /> : <MainTabs />) : <AuthNavigator />}
    </NavigationContainer>
  );
}