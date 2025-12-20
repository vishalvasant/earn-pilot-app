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
    compileSdkVersion: 35,
    targetSdkVersion: 35,
    buildToolsVersion: "35.0.0",
    adaptiveIcon: {
      foregroundImage: './assets/images/NewPilot.png',
      backgroundColor: '#0A1F44'
    },
    permissions: [
      'RECEIVE_BOOT_COMPLETED',
      'VIBRATE',
      'WAKE_LOCK',
      'POST_NOTIFICATIONS'
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
      'expo-notifications',
      {
        icon: './assets/images/NewPilot.png',
        color: '#3B82F6',
      }
    ],
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
          kotlinVersion: '1.9.24',
          compileSdkVersion: 34,
          targetSdkVersion: 34,
          buildToolsVersion: '34.0.0',
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
    // Production API (Active)
    API_BASE_URL: "https://networks11.com",
    eas: {
      projectId: "156da554-3870-41b3-9a68-2191a71f936d"
    },
    // For local development (Commented):
    // API_BASE_URL: "http://192.168.31.242:8000", // Real device
    // API_BASE_URL: "http://127.0.0.1:8000", // Emulator
  },
};
