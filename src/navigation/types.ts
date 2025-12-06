import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  // Auth Stack
  Login: undefined;
  SignUp: undefined;
  
  // Main Stack
  Dashboard: undefined;
  Transactions: undefined;
  TransactionsTable: undefined;
  UploadStatement: undefined;
  ManualTransaction: undefined;
};

// Create a type for navigation props
export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;
