# Icon System Documentation

## Overview
The Earn Pilot mobile app uses a standardized icon system built on `@expo/vector-icons`, which provides access to multiple professional icon sets including Ionicons, MaterialIcons, MaterialCommunityIcons, and FontAwesome5.

## Why Vector Icons?
- **Scalability**: Crisp rendering at any size
- **Consistency**: Uniform visual language across the app
- **Accessibility**: Better for screen readers and international users
- **Performance**: Lighter than image assets
- **Theming**: Easy to color and style dynamically

## Usage

### Basic Usage
```tsx
import Icon from '../components/Icon';

// Simple icon
<Icon name="home" size={24} color="#000" />

// With theme colors
<Icon name="money" size={24} color={theme.primary} />
```

### Icon Catalog

#### Navigation & Core
- `home` - Home icon (Ionicons)
- `tasks` - Task list icon (Ionicons)
- `games` - Game controller icon (Ionicons)
- `profile` - Profile/person icon (Ionicons)

#### Financial
- `money` - Rupee sign (FontAwesome5)
- `earnings` - Wallet icon (MaterialIcons)
- `coins` - Coins icon (FontAwesome5)

#### Status & Progress
- `checkmark` - Checkmark circle (Ionicons)
- `pending` - Hourglass empty (MaterialIcons)
- `target` - Target icon (MaterialCommunityIcons)
- `trophy` - Trophy icon (Ionicons)
- `star` - Star icon (Ionicons)

#### Communication
- `phone` - Phone call icon (Ionicons)
- `email` - Email icon (MaterialIcons)
- `notifications` - Notifications bell (Ionicons)

#### Profile & Account
- `location` - Location pin (Ionicons)
- `tag` - Price tag (Ionicons)
- `logout` - Logout icon (MaterialIcons)
- `settings` - Settings gear (Ionicons)
- `edit` - Edit pencil (MaterialIcons)

#### Tasks & Games
- `difficulty` - Signal/difficulty bars (MaterialCommunityIcons)
- `time` - Clock/time icon (Ionicons)
- `calendar` - Calendar icon (Ionicons)

#### UI Elements
- `arrowRight` - Chevron forward (Ionicons)
- `arrowLeft` - Chevron back (Ionicons)
- `close` - Close X (Ionicons)
- `info` - Information circle (Ionicons)

#### Activities
- `activity` - Chart line (MaterialCommunityIcons)
- `fire` - Flame icon (Ionicons)

## Mascot Icons Exception
Decorative emoji icons (🪙, 🎁, 🎮, 💎, 🎫, 🏆, 💰, 🎉, 🎲, 🎯) used in splash screens and background animations are intentionally kept as emojis for playful branding.

## Adding New Icons

### 1. Add to Icon Mapping
Edit `constants/icons.ts`:
```tsx
export const Icons = {
  // ... existing icons
  newIcon: { family: Ionicons, name: 'icon-name' },
} as const;
```

### 2. Update Type
TypeScript will automatically infer the new icon name from the Icons object, making it available in autocomplete.

### 3. Use in Components
```tsx
<Icon name="newIcon" size={20} color={theme.primary} />
```

## Migration Guide

### Before (Emoji)
```tsx
<Text style={styles.icon}>💰</Text>
```

### After (Vector Icon)
```tsx
<Icon name="money" size={24} color={theme.primary} />
```

### Status Icon Example
```tsx
// Before
{task.completed ? '✅' : '🎯'}

// After
<Icon 
  name={task.completed ? 'checkmark' : 'target'} 
  size={16} 
  color={task.completed ? theme.success : theme.primary} 
/>
```

## Screen-by-Screen Changes

### Tab Navigation (`app/(tabs)/_layout.tsx`)
- ✅ Home tab: `home` icon
- ✅ Tasks tab: `tasks` icon
- ✅ Wallet tab: `earnings` icon
- ✅ Profile tab: `profile` icon

### Home Screen (`app/(tabs)/home.tsx`)
- ✅ Total Earnings: `money` icon
- ✅ Completed Tasks: `checkmark` icon
- ✅ Pending Tasks: `pending` icon
- ✅ Success Rate: `target` icon

### Profile Screen (`app/(tabs)/profile.tsx`)
- ✅ Total Earned: `money` icon
- ✅ Points Balance: `checkmark` icon
- ✅ Phone: `phone` icon
- ✅ Referral Code: `tag` icon
- ✅ Email: `email` icon
- ✅ Location: `location` icon
- ✅ Notifications: `notifications` icon
- ✅ Logout: `logout` icon

### Tasks Screen (`app/(tabs)/tasks.tsx`)
- ✅ Task status: `checkmark`, `pending`, `target` icons
- ✅ Subtask status: `checkmark`, `pending` icons
- ✅ Time estimate: `time` icon
- ✅ Difficulty: `difficulty` icon

## Best Practices

### Sizing
- **Small**: 14-16px (inline text, badges)
- **Medium**: 20-24px (buttons, list items)
- **Large**: 28-32px (headers, featured items)

### Colors
Always use theme colors for consistency:
```tsx
<Icon name="home" size={24} color={theme.primary} />
<Icon name="checkmark" size={20} color={theme.success} />
<Icon name="logout" size={20} color={theme.error} />
```

### Accessibility
Icons should always have accompanying text or accessible labels:
```tsx
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
  <Icon name="notifications" size={20} color={theme.text} />
  <Text>Notifications</Text>
</View>
```

## Icon Families

### Ionicons
General purpose, modern iOS-style icons. Used for most UI elements.

### MaterialIcons
Google Material Design icons. Used for Android-style elements.

### MaterialCommunityIcons
Extended Material Design set. Used for specialized icons.

### FontAwesome5
Popular icon set. Used for financial and brand icons.

## Troubleshooting

### Icon not displaying
1. Verify icon name is in `constants/icons.ts`
2. Check icon family has the specified icon name
3. Ensure `@expo/vector-icons` is installed

### TypeScript errors
The Icon component uses TypeScript for type safety. If you see errors:
1. Make sure the icon name exists in the Icons object
2. Rebuild TypeScript (`npm run typecheck`)

### Size/alignment issues
Use `flexbox` for proper alignment:
```tsx
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
  <Icon name="star" size={20} color={theme.primary} />
  <Text>Aligned text</Text>
</View>
```

## Resources
- [Ionicons Directory](https://ionic.io/ionicons)
- [Material Icons](https://fonts.google.com/icons)
- [FontAwesome5](https://fontawesome.com/icons)
- [@expo/vector-icons Documentation](https://docs.expo.dev/guides/icons/)
