import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';


export default function RootLayout() {
  // Initialize push notifications


  // Lock orientation to portrait
  useEffect(() => {
    async function lockOrientation() {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      } catch (error) {
        console.warn('Failed to lock orientation:', error);
      }
    }
    lockOrientation();
  }, []);

  // useEffect(() => {
  //   if (expoPushToken) {
  //     console.log('App has push token:', expoPushToken);
  //   }
  // }, [expoPushToken]);

  // useEffect(() => {
  //   if (notification) {
  //     console.log('Received notification:', notification.request.content);
  //   }
  // }, [notification]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="task-detail" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
