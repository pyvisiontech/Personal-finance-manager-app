import { NativeModules, Platform } from 'react-native';

// Debug: Log all available native modules
if (__DEV__ && Platform.OS === 'android') {
  const moduleKeys = Object.keys(NativeModules);
  console.log('Available native modules:', moduleKeys);
  console.log('NativeModules count:', moduleKeys.length);
  
  // Check specifically for DownloadManagerModule
  if (NativeModules.DownloadManagerModule) {
    console.log('✅ DownloadManagerModule found!');
  } else {
    console.warn('❌ DownloadManagerModule not found in NativeModules');
    if (moduleKeys.length === 0) {
      console.error('❌ No native modules found at all! This suggests:');
      console.error('   1. App is running in Expo Go (use development build)');
      console.error('   2. Native module was not included in the build');
      console.error('   3. Package was not registered in MainApplication.kt');
      console.error('   4. App needs to be rebuilt with: npx eas-cli build --platform android --profile development');
    } else {
      console.warn('⚠️ Other native modules are available, but DownloadManagerModule is missing.');
      console.warn('⚠️ This suggests the package was not registered in MainApplication.kt');
      console.warn('⚠️ Check the build logs for config plugin errors');
    }
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

