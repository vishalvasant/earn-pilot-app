import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import '@react-native-firebase/app';
// import { getApps } from '@react-native-firebase/app';
// Firebase initializes natively from google-services.json; no manual JS init needed
// Auth module is used in the store
import { useAuthStore } from './stores/authStore';
import { APP_CONFIG } from './config/app';

// Firebase app is auto-initialized by the native SDK; avoid manual initializeApp()
// console.log('🔥 Firebase apps initialized:', getApps().length);
// console.log('🔥 Firebase apps:', getApps());

// Screens
import SplashScreen from './app/SplashScreen';
import LoginScreen from './app/(auth)/login';
import HomeScreen from './app/(tabs)/home';
import TasksScreen from './app/(tabs)/tasks';
import GamesScreen from './app/(tabs)/games';
import WalletScreen from './app/(tabs)/wallet';
import ProfileScreen from './app/(tabs)/profile';
import TaskDetailScreen from './app/task-detail';
import QuizzesScreen from './app/quizzes';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
};

// Create a nested stack for tabs to allow TaskDetail navigation
const MainStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen 
        name="TaskDetail" 
        component={TaskDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen 
        name="quizzes" 
        component={QuizzesScreen}
        options={{ animation: 'slide_from_right', title: 'Brain Teaser Quiz' }}
      />
    </Stack.Navigator>
  );
};

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#00D1FF',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          position: 'absolute',
          bottom: 15,
          left: 15,
          right: 15,
          backgroundColor: 'rgba(17, 23, 33, 0.95)',
          borderTopWidth: 0,
          borderRadius: 25,
          height: 65,
          paddingBottom: 8,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.08)',
          elevation: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 20,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        tabBarItemStyle: {
          paddingVertical: 5,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20 }}>{focused ? '🏠' : '🏠'}</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Tasks"
        component={TasksScreen}
        options={{
          title: 'Tasks',
          tabBarLabel: 'Tasks',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20 }}>{focused ? '⚡' : '⚡'}</Text>
          ),
        }}
      />
      {/* <Tab.Screen
        name="Games"
        component={GamesScreen}
        options={{
          title: 'Games',
          tabBarLabel: 'Games',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20 }}>{focused ? '🎮' : '🎮'}</Text>
          ),
        }}
      /> */}
      <Tab.Screen
        name="Wallet"
        component={WalletScreen}
        options={{
          title: 'Wallet',
          tabBarLabel: 'Wallet',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20 }}>{focused ? '💎' : '💎'}</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20 }}>{focused ? '👤' : '👤'}</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const RootStack = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { restoreToken, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        // Configure GoogleSignin for Firebase
        GoogleSignin.configure({
          webClientId: APP_CONFIG.GOOGLE_WEB_CLIENT_ID,
          offlineAccess: true,
          forceCodeForRefreshToken: true,
          scopes: ['profile', 'email'],
        });
        
        console.log('GoogleSignin configured successfully');
        
        // Restore token from storage
        await restoreToken();
      } catch (e) {
        console.error('Failed to restore token:', e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, [restoreToken]);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {isAuthenticated ? (
        <Stack.Screen
          name="MainApp"
          component={MainStack}
        />
      ) : (
        <Stack.Screen
          name="Auth"
          component={AuthStack}
        />
      )}
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer>
        <RootStack />
      </NavigationContainer>
    </View>
  );
}
