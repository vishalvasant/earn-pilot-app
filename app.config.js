export default {
  name: 'Earn Pilot',
  slug: 'earn-pilot-mobile',
  scheme: 'earnpilot',
  version: '1.0.0',
  icon: './assets/images/NewPilot.png',
  android: {
    package: 'com.networks11.earnpilot',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/images/NewPilot.png',
      backgroundColor: '#0A1F44'
    },
    permissions: [
      'RECEIVE_BOOT_COMPLETED',
      'VIBRATE',
      'WAKE_LOCK',
      'POST_NOTIFICATIONS'
    ],
  },
  ios: {
    bundleIdentifier: 'com.networks11.earnpilot',
    icon: './assets/images/NewPilot.png',
  },
  plugins: [
    [
      'expo-notifications',
      {
        icon: './assets/images/NewPilot.png',
        color: '#3B82F6',
      }
    ]
  ],
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
