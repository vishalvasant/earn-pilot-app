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
      'WAKE_LOCK',
      'android.permission.POST_NOTIFICATIONS'
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
    // Removed expo-router and expo-screen-orientation as we're using React Navigation
    // Orientation locking should be handled in App.tsx or using react-native-orientation-locker
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
    // Production API URL (use for release builds)
    API_BASE_URL: "https://networks11.com",
    eas: {
      projectId: "156da554-3870-41b3-9a68-2191a71f936d"
    },
    // Firebase and Google Sign-In Configuration
    FIREBASE_CONFIG: {
      projectId: "earn-pilot-app",
      appId: "1:731854608021:android:43e87053aba7afa6a1ed9c",
    },
    GOOGLE_CLIENT_ID: "731854608021-212j32uld6l6cgrjoce8l2f9mp7q72vg.apps.googleusercontent.com",
    APP_IDENTIFIER: "earn-pilot",
    // For local dev, override in config/app.ts or: API_BASE_URL: "http://10.0.2.2:8000"
  },
};
