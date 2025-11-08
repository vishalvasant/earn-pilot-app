const { withAndroidManifest } = require('@expo/config-plugins');

const withTargetSdk35 = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    
    // Ensure uses-sdk element exists with proper structure
    if (!androidManifest.manifest['uses-sdk']) {
      androidManifest.manifest['uses-sdk'] = [{ $: {} }];
    }
    
    // Ensure the $ attribute object exists
    if (!androidManifest.manifest['uses-sdk'][0].$) {
      androidManifest.manifest['uses-sdk'][0].$ = {};
    }
    
    // Force target SDK version to 35
    androidManifest.manifest['uses-sdk'][0].$['android:targetSdkVersion'] = '35';
    
    return config;
  });
};

module.exports = withTargetSdk35;