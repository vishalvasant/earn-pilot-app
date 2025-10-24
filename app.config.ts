export default {
  name: "Earn Pilot",
  slug: "earn-pilot-mobile",
  scheme: "earnpilot",
  version: "1.0.0",
  android: {
    package: "com.networks11.earnpilot",
    versionCode: 1,
  },
  extra: {
    // Production API (Active)
    API_BASE_URL: "https://networks11.com",
    eas: {
      projectId: "156da554-3870-41b3-9a68-2191a71f936d"
    }
    // For local development (Commented):
    // API_BASE_URL: "http://192.168.31.242:8000", // Real device
    // API_BASE_URL: "http://127.0.0.1:8000", // Emulator
  },
};
