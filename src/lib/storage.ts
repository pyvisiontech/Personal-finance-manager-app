import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const isWeb = Platform.OS === 'web';

export const secureGetItem = async (key: string): Promise<string | null> => {
  if (isWeb) {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return await SecureStore.getItemAsync(key);
};

export const secureSetItem = async (key: string, value: string): Promise<void> => {
  if (isWeb) {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Ignore quota / privacy mode errors
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
};

export const secureDeleteItem = async (key: string): Promise<void> => {
  if (isWeb) {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
};

