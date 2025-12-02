import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { cssInterop } from 'nativewind';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView,
  FlatList,
  ActivityIndicator,
  Image
} from 'react-native';
import './global.css';

// Enable className prop for React Native components
cssInterop(View, { className: 'style' });
cssInterop(Text, { className: 'style' });
cssInterop(TextInput, { className: 'style' });
cssInterop(TouchableOpacity, { className: 'style' });
cssInterop(ScrollView, { 
  className: 'style',
  contentContainerClassName: 'contentContainerStyle'
});
cssInterop(KeyboardAvoidingView, { className: 'style' });
cssInterop(FlatList, { 
  className: 'style',
  contentContainerClassName: 'contentContainerStyle'
});
cssInterop(ActivityIndicator, { className: 'style' });
cssInterop(Image, { className: 'style' });

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppNavigator />
      <StatusBar style="auto" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
