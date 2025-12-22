import { NativeModules, Platform } from 'react-native';

// Debug: Log all available native modules
if (__DEV__ && Platform.OS === 'android') {
  console.log('Available native modules:', Object.keys(NativeModules));
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

