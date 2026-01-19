/**
 * Standardized Icon System
 * Using react-native-vector-icons for consistent, scalable icons throughout the app
 * Excludes mascot/decorative animations which remain as emojis
 */

import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

export const Icons = {
  // Navigation & Core
  home: { family: Ionicons, name: 'home' },
  tasks: { family: Ionicons, name: 'list' },
  games: { family: Ionicons, name: 'game-controller' },
  profile: { family: Ionicons, name: 'person' },
  
  // Financial
  money: { family: FontAwesome5, name: 'rupee-sign' },
  earnings: { family: MaterialIcons, name: 'account-balance-wallet' },
  coins: { family: FontAwesome5, name: 'coins' },
  coin: '🪙', // Coin emoji for reward points
  
  // Status & Progress
  checkmark: { family: Ionicons, name: 'checkmark-circle' },
  pending: { family: MaterialIcons, name: 'hourglass-empty' },
  target: { family: MaterialCommunityIcons, name: 'target' },
  trophy: { family: Ionicons, name: 'trophy' },
  star: { family: Ionicons, name: 'star' },
  
  // Communication
  phone: { family: Ionicons, name: 'call' },
  email: { family: MaterialIcons, name: 'email' },
  notifications: { family: Ionicons, name: 'notifications' },
  
  // Profile & Account
  location: { family: Ionicons, name: 'location' },
  tag: { family: Ionicons, name: 'pricetag' },
  logout: { family: MaterialIcons, name: 'logout' },
  settings: { family: Ionicons, name: 'settings' },
  edit: { family: MaterialIcons, name: 'edit' },
  
  // Tasks & Games
  difficulty: { family: MaterialCommunityIcons, name: 'signal' },
  time: { family: Ionicons, name: 'time' },
  calendar: { family: Ionicons, name: 'calendar' },
  
  // UI Elements
  arrowRight: { family: Ionicons, name: 'chevron-forward' },
  arrowLeft: { family: Ionicons, name: 'chevron-back' },
  close: { family: Ionicons, name: 'close' },
  info: { family: Ionicons, name: 'information-circle' },
  
  // Activities
  activity: { family: MaterialCommunityIcons, name: 'chart-line' },
  fire: { family: Ionicons, name: 'flame' },
} as const;

export type IconName = keyof typeof Icons;

// Helper component types for TypeScript
export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}
