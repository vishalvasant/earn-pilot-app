import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { usePushNotifications } from '../hooks/usePushNotifications';

export default function RootLayout() {
  // Initialize push notifications
  const { expoPushToken, notification } = usePushNotifications();

  useEffect(() => {
    if (expoPushToken) {
      console.log('App has push token:', expoPushToken);
    }
  }, [expoPushToken]);

  useEffect(() => {
    if (notification) {
      console.log('Received notification:', notification.request.content);
    }
  }, [notification]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
