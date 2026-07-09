import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

/**
 * FCM Service for handling Firebase Cloud Messaging
 * Registers device tokens and handles incoming notifications.
 * On Android, user can enable notifications from Settings → Apps → Earn Pilot → Notifications.
 * POST_NOTIFICATIONS is declared in app.config.js so the app can receive notifications when enabled.
 */

let messageHandlersRegistered = false;
let fcmTokenInFlight: Promise<string | null> | null = null;

function getErrorMessage(error: unknown): string {
  const err = error as { message?: string };
  return String(err?.message ?? error ?? '');
}

/** Firebase project misconfigured or deleted — FCM token cannot be issued. */
function isFirebaseMessagingUnavailable(error: unknown): boolean {
  const msg = getErrorMessage(error);
  return (
    msg.includes('FIS_AUTH_ERROR') ||
    msg.includes('messaging/unknown') ||
    msg.includes('MISSING_INSTANCEID_SERVICE') ||
    msg.includes('SERVICE_NOT_AVAILABLE')
  );
}

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
    if (isFirebaseMessagingUnavailable(error)) {
      console.warn('Firebase Messaging unavailable (check google-services.json / Firebase project).');
      return false;
    }
    console.warn('Error checking notification permission:', error);
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
    if (isFirebaseMessagingUnavailable(error)) {
      console.warn('Firebase Messaging unavailable — push notifications disabled until Firebase is configured.');
      return false;
    }
    console.warn('Error requesting notification permission:', error);
  }
  return false;
}

// Get FCM token (single-flight: concurrent callers share one request)
export async function getFCMToken(): Promise<string | null> {
  if (fcmTokenInFlight) return fcmTokenInFlight;

  fcmTokenInFlight = (async () => {
    try {
      const cachedToken = await AsyncStorage.getItem('fcm_token');
      if (cachedToken) {
        return cachedToken;
      }

      const token = await messaging().getToken();
      if (token) {
        await AsyncStorage.setItem('fcm_token', token);
        return token;
      }
    } catch (error) {
      if (isFirebaseMessagingUnavailable(error)) {
        await AsyncStorage.removeItem('fcm_token');
        console.warn(
          'Push notifications unavailable: Firebase project may be deleted or misconfigured (FIS_AUTH_ERROR). Email login still works.'
        );
      } else {
        console.warn('Error getting FCM token:', error);
      }
    }
    return null;
  })();

  try {
    return await fcmTokenInFlight;
  } finally {
    fcmTokenInFlight = null;
  }
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
        console.warn('Error registering device token (retry failed):', retryError);
      }
    } else {
      console.warn('Error registering device token:', error);
    }
  }
  return false;
}

// Setup message handlers (once per app session)
export function setupMessageHandlers() {
  if (messageHandlersRegistered) return () => {};
  messageHandlersRegistered = true;

  const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
    if (remoteMessage.notification) {
      console.log(
        'Notification:',
        remoteMessage.notification.title,
        remoteMessage.notification.body
      );
    }
  });

  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('Message handled in the background!', remoteMessage);
  });

  messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log('Notification caused app to open from background:', remoteMessage);
  });

  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        console.log('Notification caused app to open from quit state:', remoteMessage);
      }
    })
    .catch(() => {});

  return () => {
    unsubscribeForeground();
    messageHandlersRegistered = false;
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
    console.warn('Error deactivating device token:', error);
  }
  return false;
}
