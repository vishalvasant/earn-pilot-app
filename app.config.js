export default {
  name: 'Earn Pilot',
  slug: 'earn-pilot-mobile',
  scheme: 'earnpilot',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/NewPilot.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/images/NewPilot.png',
    resizeMode: 'contain',
    backgroundColor: '#0A1F44'
  },
  assetBundlePatterns: ['**/*'],
  android: {
    package: 'com.networks11.earnpilot',
    versionCode: 4,
    compileSdkVersion: 34,
    targetSdkVersion: 34,
    buildToolsVersion: "34.0.0",
    adaptiveIcon: {
      foregroundImage: './assets/images/NewPilot.png',
      backgroundColor: '#0A1F44'
    },
    permissions: [
      'RECEIVE_BOOT_COMPLETED',
      'VIBRATE',
      'WAKE_LOCK'
    ]
  },
  ios: {
    bundleIdentifier: 'com.networks11.earnpilot',
    icon: './assets/images/NewPilot.png',
    supportsTablet: true,
    orientation: 'portrait'
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/NewPilot.png'
  },
  plugins: [
    'expo-router',
    [
      'expo-screen-orientation',
      {
        initialOrientation: 'PORTRAIT'
      }
    ],
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: 'ca-app-pub-3940256099942544~3347511713',
        iosAppId: 'ca-app-pub-3940256099942544~1458002511'
      }
    ],
    [
      'expo-build-properties',
      {
        android: {
          kotlinVersion: '1.9.25',
          compileSdkVersion: 35,
          targetSdkVersion: 36,
          buildToolsVersion: '35.0.0',
          ndkVersion: '26.1.10909125'
        }
      }
    ]
  ],
  experiments: {
    typedRoutes: true
  },
  extra: {
    // Dynamically set API URL based on environment or default to localhost
    // Local API (Active)
    API_BASE_URL: "http://192.168.31.206:8000",
    eas: {
      projectId: "156da554-3870-41b3-9a68-2191a71f936d"
    },
    // For production:
    // API_BASE_URL: "https://networks11.com",
    // For local development (LAN):
    // API_BASE_URL: "http://192.168.31.25:8000", // Real device
  },
};
