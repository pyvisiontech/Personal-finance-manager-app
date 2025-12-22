const { withDangerousMod, withMainApplication } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin to add DownloadManager native module
 */
const withDownloadManager = (config) => {
  // Step 1: Copy native module files
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      try {
        const projectRoot = config.modRequest.projectRoot;
        const androidPath = path.join(projectRoot, 'android');
        
        // Source files location (in native-modules folder, not gitignored)
        const sourceModulePath = path.join(projectRoot, 'native-modules', 'DownloadManagerModule.kt');
        const sourcePackagePath = path.join(projectRoot, 'native-modules', 'DownloadManagerPackage.kt');
        
        // Destination in android project
        const destDir = path.join(
          androidPath,
          'app',
          'src',
          'main',
          'java',
          'com',
          'rajaramsingh',
          'personalfinancetracker'
        );
        
        const destModulePath = path.join(destDir, 'DownloadManagerModule.kt');
        const destPackagePath = path.join(destDir, 'DownloadManagerPackage.kt');
        
        // Ensure destination directory exists
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        
        // Copy files if they exist in source location
        if (fs.existsSync(sourceModulePath)) {
          fs.copyFileSync(sourceModulePath, destModulePath);
          console.log('✅ Copied DownloadManagerModule.kt');
        } else {
          console.error('❌ DownloadManagerModule.kt not found at:', sourceModulePath);
          throw new Error(`DownloadManagerModule.kt not found at ${sourceModulePath}`);
        }
        
        if (fs.existsSync(sourcePackagePath)) {
          fs.copyFileSync(sourcePackagePath, destPackagePath);
          console.log('✅ Copied DownloadManagerPackage.kt');
        } else {
          console.error('❌ DownloadManagerPackage.kt not found at:', sourcePackagePath);
          throw new Error(`DownloadManagerPackage.kt not found at ${sourcePackagePath}`);
        }
      } catch (error) {
        console.error('❌ Error in withDangerousMod:', error);
        throw error;
      }
      
      return config;
    },
  ]);

  // Step 2: Update MainApplication.kt to register the package
  config = withMainApplication(config, (config) => {
    try {
      const mainApplicationPath = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'java',
        'com',
        'rajaramsingh',
        'personalfinancetracker',
        'MainApplication.kt'
      );

      if (!fs.existsSync(mainApplicationPath)) {
        console.warn('⚠️ MainApplication.kt not found at:', mainApplicationPath);
        return config;
      }

      let contents = fs.readFileSync(mainApplicationPath, 'utf-8');
      let modified = false;
      
      // Add import if not present
      if (!contents.includes('import com.rajaramsingh.personalfinancetracker.DownloadManagerPackage')) {
        // Add import after expo imports
        if (contents.includes('import expo.modules.ReactNativeHostWrapper')) {
          contents = contents.replace(
            /(import expo\.modules\.ReactNativeHostWrapper)/,
            '$1\nimport com.rajaramsingh.personalfinancetracker.DownloadManagerPackage'
          );
          modified = true;
        } else {
          // Fallback: add after last import
          const importRegex = /(import\s+[\w.]+;)/g;
          const matches = [...contents.matchAll(importRegex)];
          if (matches.length > 0) {
            const lastMatch = matches[matches.length - 1];
            const insertIndex = lastMatch.index + lastMatch[0].length;
            contents = contents.slice(0, insertIndex) + 
              '\nimport com.rajaramsingh.personalfinancetracker.DownloadManagerPackage' +
              contents.slice(insertIndex);
            modified = true;
          }
        }
      }
      
      // Add package to packages list if not present
      if (!contents.includes('add(DownloadManagerPackage())')) {
        // Try multiple patterns to find the packages list
        const patterns = [
          // Pattern 1: Standard format
          /(PackageList\(this\)\.packages\.apply\s*\{)([\s\S]*?)(\s*\})/,
          // Pattern 2: With comments
          /(PackageList\(this\)\.packages\.apply\s*\{[\s\S]*?)(\s*\})/,
        ];
        
        let found = false;
        for (const pattern of patterns) {
          const match = contents.match(pattern);
          if (match) {
            const before = match[1];
            const middle = match[2] || '';
            const after = match[3] || match[2];
            
            // Check if already added
            if (!middle.includes('DownloadManagerPackage') && !before.includes('DownloadManagerPackage')) {
              // Add the package registration
              const newContent = before + (middle.trim() ? middle.trim() + '\n              ' : '') + 'add(DownloadManagerPackage())\n            ' + after;
              contents = contents.replace(pattern, newContent);
              modified = true;
              found = true;
              break;
            }
          }
        }
        
        if (!found) {
          // Last resort: append before closing brace
          contents = contents.replace(
            /(\s*\/\/ Packages that cannot be autolinked[\s\S]*?)(\s*\})/,
            '$1\n              add(DownloadManagerPackage())\n            $2'
          );
          modified = true;
        }
      }
      
      if (modified) {
        fs.writeFileSync(mainApplicationPath, contents);
        console.log('✅ Updated MainApplication.kt');
      } else {
        console.log('ℹ️ MainApplication.kt already has DownloadManagerPackage');
      }
    } catch (error) {
      console.error('❌ Error updating MainApplication.kt:', error);
      // Don't throw - let the build continue, the files are copied at least
    }
    
    return config;
  });

  return config;
};

module.exports = withDownloadManager;
