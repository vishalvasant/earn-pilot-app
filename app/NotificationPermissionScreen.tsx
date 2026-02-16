import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Linking,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { requestNotificationPermission, hasNotificationPermission } from '../services/fcm';
import { themeColors, typography, spacing } from '../hooks/useThemeColors';

interface NotificationPermissionScreenProps {
  onGranted: () => void;
}

export default function NotificationPermissionScreen({ onGranted }: NotificationPermissionScreenProps) {
  const [requesting, setRequesting] = useState(false);
  const [denied, setDenied] = useState(false);

  const handleAllow = async () => {
    setRequesting(true);
    setDenied(false);
    try {
      await requestNotificationPermission();
      // Only allow app access when we actually have permission (verified)
      const hasPermission = await hasNotificationPermission();
      if (hasPermission) {
        onGranted();
      } else {
        setDenied(true);
      }
    } catch (e) {
      setDenied(true);
    } finally {
      setRequesting(false);
    }
  };

  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  // If user already has permission (e.g. reinstall or returned from Settings), allow through
  useEffect(() => {
    hasNotificationPermission().then((granted) => {
      if (granted) onGranted();
    });
  }, []);

  return (
    <LinearGradient
      colors={['#0a1931', themeColors.bgDark]}
      style={styles.container}
      start={{ x: 1, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <StatusBar barStyle="light-content" backgroundColor={themeColors.bgDark} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <Text style={styles.icon}>🔔</Text>
          <Text style={styles.title}>Enable Notifications</Text>
          <Text style={styles.message}>
            Earn Pilot needs notification permission to send you rewards, task reminders, and updates. Please allow to continue.
          </Text>
          {denied && (
            <>
              <Text style={styles.deniedText}>
                Notifications are required to use the app. Go to Settings and turn on notifications for Earn Pilot, then return here.
              </Text>
              <TouchableOpacity
                style={[styles.button, styles.settingsButton]}
                onPress={handleOpenSettings}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Open Settings</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            style={[styles.button, requesting && styles.buttonDisabled]}
            onPress={handleAllow}
            disabled={requesting}
            activeOpacity={0.8}
          >
            {requesting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>{denied ? 'Try again' : 'Allow notifications'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  content: {
    alignItems: 'center',
  },
  icon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  message: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  deniedText: {
    fontSize: 14,
    color: 'rgba(255,200,100,0.95)',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: themeColors.primaryBlue,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 220,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.8,
  },
  settingsButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    marginBottom: spacing.md,
  },
  buttonText: {
    fontSize: typography.base,
    fontWeight: '700',
    color: '#ffffff',
  },
});
