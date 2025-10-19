import { Tabs } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import Icon from '../../components/Icon';
import { IconName } from '../../constants/icons';

const { width } = Dimensions.get('window');
const TAB_COUNT = 4;
const TAB_WIDTH = width / TAB_COUNT;

export default function TabsLayout() {
  const theme = useTheme();

  const CustomTabBar = ({ state, descriptors, navigation }: any) => {
    const indicatorPosition = useRef(new Animated.Value(0)).current;

    const animateIndicator = (index: number) => {
      Animated.spring(indicatorPosition, {
        toValue: index * TAB_WIDTH,
        useNativeDriver: true,
        tension: 100,
        friction: 12,
      }).start();
    };

    useEffect(() => {
      animateIndicator(state.index);
    }, [state.index]);

    const iconMap: { [key: string]: IconName } = {
      home: 'home',
      tasks: 'tasks',
      wallet: 'earnings',
      profile: 'profile',
    };

    const labelMap: { [key: string]: string } = {
      home: 'Home',
      tasks: 'Tasks',
      wallet: 'Wallet',
      profile: 'Profile',
    };

    return (
      <View style={[styles.tabBarContainer, { backgroundColor: theme.card }]}>
        {/* Clean Underline Indicator - Stripe Style */}
        <Animated.View
          style={[
            styles.underlineIndicator,
            {
              backgroundColor: theme.primary,
              transform: [{ translateX: indicatorPosition }],
            },
          ]}
        />

        {/* Tab Buttons */}
        <View style={styles.tabRow}>
          {state.routes.map((route: any, index: number) => {
            const isFocused = state.index === index;
            const iconName = iconMap[route.name] || 'home';
            const label = labelMap[route.name] || route.name;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TouchableOpacity
                key={route.key}
                style={styles.tabButton}
                onPress={onPress}
                activeOpacity={0.7}
              >
                <View style={styles.iconWrapper}>
                  <Icon
                    name={iconName}
                    size={24}
                    color={isFocused ? theme.primary : theme.textSecondary}
                  />
                </View>
                <Text
                  style={[
                    styles.label,
                    {
                      color: isFocused ? theme.text : theme.textSecondary,
                      fontWeight: isFocused ? '600' : '500',
                    },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tasks' }} />
      <Tabs.Screen name="wallet" options={{ title: 'Wallet' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'relative',
    flexDirection: 'column',
    height: 70,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  underlineIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: TAB_WIDTH,
    height: 3,
    borderRadius: 2,
  },
  tabRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  iconWrapper: {
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
});
