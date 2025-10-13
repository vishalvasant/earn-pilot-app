import { Tabs } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export default function TabsLayout() {
  const theme = useTheme();

  const TabIcon = ({ emoji, focused }: { emoji: string; focused: boolean }) => (
    <Text style={{ 
      fontSize: 24, 
      opacity: focused ? 1 : 0.6,
      transform: [{ scale: focused ? 1.1 : 1 }],
    }}>
      {emoji}
    </Text>
  );

  return (
    <Tabs 
      screenOptions={{ 
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 8,
          height: 80,
          shadowColor: theme.text,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 10,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen 
        name="home" 
        options={{ 
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }} 
      />
      <Tabs.Screen 
        name="tasks" 
        options={{ 
          title: 'Explore',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🧭" focused={focused} />,
        }} 
      />
      <Tabs.Screen 
        name="wallet" 
        options={{ 
          title: 'Wallet',
          tabBarIcon: ({ focused }) => <TabIcon emoji="💰" focused={focused} />,
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }} 
      />
    </Tabs>
  );
}
