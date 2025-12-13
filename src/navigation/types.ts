import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TransactionWithCategory } from '../lib/types';

export type RootStackParamList = {
  // Auth Stack
  Login: undefined;
  SignUp: undefined;
  
  // Main Stack
  Dashboard: undefined;
  Transactions: undefined;
  TransactionsTable: undefined;
  UploadStatement: undefined;
  ManualTransaction: { transaction?: TransactionWithCategory } | undefined;
};

// Create a type for navigation props
export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;
