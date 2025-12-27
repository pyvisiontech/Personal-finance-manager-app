import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TransactionWithCategory, FamilyGroup } from '../lib/types';

// Home Stack (Dashboard Tab)
export type HomeStackParamList = {
  Dashboard: undefined;
  UploadStatement: undefined;
  Profile: undefined;
  GroupsList: undefined;
  CreateGroup: { groupId?: string; groupName?: string } | undefined;
  GroupDetails: undefined;
  
  // Notifications
  Notifications: undefined;
};

// Transactions Stack
export type TransactionsStackParamList = {
  TransactionsList: undefined;
  TransactionsTable: undefined;
  ManualTransaction: { transaction?: TransactionWithCategory } | undefined;
  UploadStatement: undefined;
};

// Statements Stack
export type StatementsStackParamList = {
  StatementsList: undefined;
  UploadStatement: undefined;
};

// Auth Stack
export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

// Onboarding Stack
export type OnboardingStackParamList = {
  Welcome: undefined;
};

// Root Stack (combines all)
export type RootStackParamList = {
  // Auth Stack
  Login: undefined;
  SignUp: undefined;
  
  // Onboarding
  Welcome: undefined;
  
  // Main Stack
  Dashboard: undefined;
  Transactions: undefined;
  TransactionsList: undefined;
  TransactionsTable: undefined;
  UploadStatement: undefined;
  ManualTransaction: { transaction?: TransactionWithCategory } | undefined;
  StatementsList: undefined;
  Profile: undefined;
  
  // Groups Stack
  GroupsList: undefined;
  CreateGroup: { groupId?: string; groupName?: string } | undefined;
  GroupDetails: undefined;
  
  // Notifications
  Notifications: undefined;
};

// Create a type for navigation props
export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;
