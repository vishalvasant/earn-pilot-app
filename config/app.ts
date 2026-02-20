export const APP_CONFIG = {
  API_BASE_URL: 'https://networks11.com', // Production
  // API_BASE_URL: 'http://192.168.31.102:8000', // Local (Android emulator)
  // API_BASE_URL: 'http://10.0.2.2:8000', // Local (Android emulator)
  APP_IDENTIFIER: 'earn-pilot',
  /** Fallback store URL for add-on games when admin API does not provide store_url. Append package_name for Play Store. */
  ADDON_GAME_STORE_URL: 'https://play.google.com/store/apps/details?id=',
  /** Play Store link for Earn Pilot app (referral share/copy). */
  PLAY_STORE_APP_URL: 'https://play.google.com/store/apps/details?id=com.networks11.earnpilot',
  /**
   * Ads origin / geo-targeting: location sent with every ad request so ads are targeted as from this region.
   * Set to Hong Kong so ad requests use HK origin (not device location e.g. India).
   * Set to null to use device location instead.
   */
  AD_REQUEST_LOCATION: {
    latitude: 22.3193,   // Hong Kong
    longitude: 114.1694,
    accuracy: 100,
  } as { latitude: number; longitude: number; accuracy?: number } | null,
  FIREBASE_API_KEY: 'AIzaSyDJcurdZwgTu3J4VWQLBf8OOdvgmIF5uro',
  FIREBASE_AUTH_DOMAIN: 'earn-pilot-app.firebaseapp.com',
  FIREBASE_PROJECT_ID: 'earn-pilot-app',
  FIREBASE_STORAGE_BUCKET: 'earn-pilot-app.firebasestorage.app',
  FIREBASE_MESSAGING_SENDER_ID: '731854608021',
  FIREBASE_APP_ID: '1:731854608021:android:43e87053aba7afa6a1ed9c',
  GOOGLE_WEB_CLIENT_ID: '731854608021-212j32uld6l6cgrjoce8l2f9mp7q72vg.apps.googleusercontent.com',
  GOOGLE_ANDROID_CLIENT_ID: '731854608021-0ps74hids4u0vbdtdrhmcqviqjv5cfbl.apps.googleusercontent.com',
};
