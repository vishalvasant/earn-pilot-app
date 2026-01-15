import { Tabs } from 'expo-router';
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions } from 'react-native';
import { themeColors, typography, spacing, borderRadius } from '../../hooks/useThemeColors';

const { width } = Dimensions.get('window');

export default function TabsLayout() {
  const renderCustomTabBar = (props: any) => {
    const { state, navigation } = props;

    const tabs = [
      { name: 'home', icon: '🏠', label: 'HOME' },
      { name: 'tasks', icon: '⚡', label: 'TASKS' },
      { name: 'wallet', icon: '💰', label: 'WALLET' },
      { name: 'profile', icon: '👤', label: 'PROFILE' },
    ];

    return (
      <View style={styles.tabBarContainer}>
        {tabs.map((tab, index) => {
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: state.routes[index].key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(state.routes[index].name);
            }
          };

          return (
            <TouchableOpacity
              key={tab.name}
              style={[styles.tabItem, isFocused && styles.tabItemActive]}
              onPress={onPress}
              activeOpacity={0.8}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <Tabs
      tabBar={renderCustomTabBar}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tasks' }} />
      <Tabs.Screen name="wallet" options={{ title: 'Wallet' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    height: 65,
    backgroundColor: 'rgba(17, 23, 33, 0.95)',
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 209, 255, 0.15)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: themeColors.primaryBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.4,
    paddingVertical: spacing.md,
  },
  tabItemActive: {
    opacity: 1,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  tabLabel: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: themeColors.textMain,
    textTransform: 'uppercase',
  },
  tabLabelActive: {
    color: themeColors.primaryBlue,
  },
});
