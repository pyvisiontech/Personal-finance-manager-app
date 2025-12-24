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
          console.log('✅ Copied DownloadManagerModule.kt to:', destModulePath);
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
      if (!contents.includes('add(DownloadManagerPackage())') && !contents.includes('DownloadManagerPackage()')) {
        // Try to find the getPackages function
        const getPackagesMatch = contents.match(/(override\s+fun\s+getPackages\(\)[^{]*\{)([\s\S]*?)(\s*\})/);
        
        if (getPackagesMatch) {
          const before = getPackagesMatch[1];
          const middle = getPackagesMatch[2] || '';
          const after = getPackagesMatch[3];
          
          // Find the closing brace of PackageList(...).packages.apply { ... }
          const applyMatch = middle.match(/(PackageList\([^)]+\)\.packages\.apply\s*\{)([\s\S]*?)(\s*\})/);
          
          if (applyMatch) {
            const applyBefore = applyMatch[1];
            const applyMiddle = applyMatch[2] || '';
            const applyAfter = applyMatch[3];
            
            // Add the package registration before the closing brace
            const newApplyContent = applyBefore + 
              (applyMiddle.trim() ? applyMiddle.trim() + '\n              ' : '') + 
              'add(DownloadManagerPackage())\n            ' + 
              applyAfter;
            
            contents = contents.replace(
              /(PackageList\([^)]+\)\.packages\.apply\s*\{)([\s\S]*?)(\s*\})/,
              newApplyContent
            );
            modified = true;
          } else {
            // Fallback: try to add after PackageList
            contents = contents.replace(
              /(PackageList\([^)]+\)\.packages\.apply\s*\{)/,
              '$1\n              add(DownloadManagerPackage())\n            '
            );
            modified = true;
          }
        } else {
          // Last resort: search for any packages list pattern
          contents = contents.replace(
            /(PackageList\([^)]+\)\.packages\.apply\s*\{[\s\S]*?)(\s*\})/,
            '$1\n              add(DownloadManagerPackage())\n            $2'
          );
          modified = true;
        }
      }
      
      if (modified) {
        fs.writeFileSync(mainApplicationPath, contents);
        console.log('✅ Updated MainApplication.kt with DownloadManagerPackage');
        
        // Verify the update
        const verifyContents = fs.readFileSync(mainApplicationPath, 'utf-8');
        if (verifyContents.includes('DownloadManagerPackage')) {
          console.log('✅ Verified: DownloadManagerPackage is in MainApplication.kt');
        } else {
          console.error('❌ WARNING: DownloadManagerPackage not found in MainApplication.kt after update!');
        }
      } else {
        console.log('ℹ️ MainApplication.kt already has DownloadManagerPackage');
        
        // Verify it's actually there
        if (contents.includes('DownloadManagerPackage')) {
          console.log('✅ Verified: DownloadManagerPackage is already in MainApplication.kt');
        } else {
          console.error('❌ WARNING: DownloadManagerPackage not found but marked as already present!');
        }
      }
    } catch (error) {
      console.error('❌ Error updating MainApplication.kt:', error);
      console.error('❌ Stack trace:', error.stack);
      // Don't throw - let the build continue, the files are copied at least
    }
    
    return config;
  });

  return config;
};

module.exports = withDownloadManager;
