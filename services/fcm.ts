import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

/**
 * FCM Service for handling Firebase Cloud Messaging
 * Registers device tokens and handles incoming notifications.
 * On Android, user can enable notifications from Settings → Apps → Earn Pilot → Notifications.
 * POST_NOTIFICATIONS is declared in app.config.js so the app can receive notifications when enabled.
 */

/**
 * Check if the app currently has notification permission (without requesting).
 * Use this to gate app access: only allow when this returns true.
 */
export async function hasNotificationPermission(): Promise<boolean> {
  try {
    const authStatus = await messaging().hasPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    return enabled;
  } catch (error) {
    console.error('Error checking notification permission:', error);
    return false;
  }
}

/**
 * Request notification permission (shows system dialog).
 * Returns true only when the user actually grants permission.
 */
export async function requestNotificationPermission(): Promise<boolean> {
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

function isNetworkError(error: unknown): boolean {
  const err = error as { message?: string; code?: string };
  return err?.message === 'Network Error' || err?.code === 'ERR_NETWORK';
}

// Register device token with backend (retries once on network error)
export async function registerDeviceToken(authToken: string, fcmToken: string) {
  const attempt = async (): Promise<boolean> => {
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
    return false;
  };

  try {
    return await attempt();
  } catch (error) {
    if (isNetworkError(error)) {
      try {
        await new Promise((r) => setTimeout(r, 2000));
        return await attempt();
      } catch (retryError) {
        console.error('Error registering device token (retry failed):', retryError);
      }
    } else {
      console.error('Error registering device token:', error);
    }
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
