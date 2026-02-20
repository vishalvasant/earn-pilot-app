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
    [
      'react-native-google-mobile-ads',
      {
        // Use your real AdMob App IDs from AdMob dashboard / admin. Test IDs force test ads everywhere.
        androidAppId: 'ca-app-pub-1702224910233562~6831511231',
        iosAppId: 'ca-app-pub-1702224910233562~6831511231' // Replace with your iOS App ID from AdMob if different
      }
    ]
  ],
  extra: {
    // Production API URL (use for release builds)
    API_BASE_URL: "https://networks11.com",
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
