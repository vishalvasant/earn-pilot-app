import { useEffect, useRef, useState } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string>();
  const [notification, setNotification] = useState<Notifications.Notification | undefined>();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const isAuthenticated = useAuthStore((state) => !!state.token);

  useEffect(() => {
    // Only register for push notifications if user is authenticated
    if (!isAuthenticated) {
      return;
    }

    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
        // Register token with backend
        registerTokenWithBackend(token);
      }
    });

    // Listener for when notification is received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
    });

    console.log('Push token registered with backend');
  } catch (error) {
    console.error('Failed to register push token with backend:', error);
  }
}
