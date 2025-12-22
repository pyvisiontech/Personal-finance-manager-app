import { NativeModules, Platform } from 'react-native';

// Debug: Log all available native modules
if (__DEV__ && Platform.OS === 'android') {
  const moduleKeys = Object.keys(NativeModules);
  console.log('Available native modules:', moduleKeys);
  console.log('NativeModules object:', NativeModules);
  
  // Check specifically for DownloadManagerModule
  if (NativeModules.DownloadManagerModule) {
    console.log('✅ DownloadManagerModule found!');
  } else {
    console.warn('❌ DownloadManagerModule not found in NativeModules');
  }
}

const { DownloadManagerModule } = NativeModules;

interface DownloadManagerInterface {
  saveFileWithPicker(fileUri: string, fileName: string): Promise<string>;
}

export const DownloadManager: DownloadManagerInterface = {
  saveFileWithPicker: (fileUri: string, fileName: string): Promise<string> => {
    if (Platform.OS !== 'android') {
      return Promise.reject(new Error('DownloadManager is only available on Android'));
    }
    if (!DownloadManagerModule) {
      // Log available modules for debugging
      if (__DEV__) {
        console.warn('DownloadManagerModule not found. Available modules:', Object.keys(NativeModules));
      }
      return Promise.reject(new Error('DownloadManagerModule is not available'));
    }
    return DownloadManagerModule.saveFileWithPicker(fileUri, fileName);
  },
};

