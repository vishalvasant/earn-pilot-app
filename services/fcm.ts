import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

/**
 * FCM Service for handling Firebase Cloud Messaging
 * Registers device tokens and handles incoming notifications.
 * On Android, user can enable notifications from Settings → Apps → Earn Pilot → Notifications.
 * POST_NOTIFICATIONS is declared in app.config.js so the app can receive notifications when enabled.
 */

// Request notification permission (system dialog). Not used by default; user enables from device Settings.
export async function requestNotificationPermission() {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Notification permission granted');
      return true;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
  }
  return false;
}

// Get FCM token
export async function getFCMToken(): Promise<string | null> {
  try {
    // Check if token is cached
    const cachedToken = await AsyncStorage.getItem('fcm_token');
    if (cachedToken) {
      return cachedToken;
    }

    // Get fresh token from Firebase
    const token = await messaging().getToken();
    if (token) {
      // Cache the token
      await AsyncStorage.setItem('fcm_token', token);
      console.log('FCM token:', token);
      return token;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
  }
  return null;
}

// Register device token with backend
export async function registerDeviceToken(authToken: string, fcmToken: string) {
  try {
    const response = await api.post(
      `/device-tokens/register`,
      {
        fcm_token: fcmToken,
        app_identifier: 'earn-pilot',
        device_type: 'Android',
      }
    );

    if (response.data.success) {
      console.log('Device token registered successfully');
      return true;
    }
  } catch (error) {
    console.error('Error registering device token:', error);
  }
  return false;
}

// Setup message handlers
export function setupMessageHandlers() {
  // Handle foreground messages
  const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
    console.log('Message received in foreground:', remoteMessage);

    // Display the notification
    if (remoteMessage.notification) {
      // You can use a notification library here to show the notification
      console.log(
        'Notification:',
        remoteMessage.notification.title,
        remoteMessage.notification.body
      );
    }
  });

  // Handle background messages (when app is in background)
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('Message handled in the background!', remoteMessage);
  });

  // Handle notification tap (when app is closed)
  messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log('Notification caused app to open from quit state:', remoteMessage);
    // Handle navigation based on notification data
  });

  // Check if app was opened from a notification when it was completely quit
  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        console.log('Notification caused app to open from quit state:', remoteMessage);
        // Handle navigation based on notification data
      }
    });

  // Return cleanup function
  return () => {
    unsubscribeForeground();
  };
}

// Cleanup device token
export async function cleanupDeviceToken(authToken: string) {
  try {
    const response = await api.post(
      `/device-tokens/deactivate`,
      {
        app_identifier: 'earn-pilot',
        device_type: 'Android',
      }
    );

    if (response.data.success) {
      console.log('Device token deactivated successfully');
      return true;
    }
  } catch (error) {
    console.error('Error deactivating device token:', error);
  }
  return false;
}
