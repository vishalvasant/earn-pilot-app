# Adding Your Mascot Image

## Quick Setup

1. **Save your mascot image** as `mascot.png` in this directory
2. **Replace the fallback code** in `app/(auth)/login.tsx`

## Code to replace (line ~147-152):

```tsx
{/* TODO: Replace with actual mascot image when available */}
<Text style={styles.mascotEmoji}>🚀</Text>
<Text style={styles.mascotLabel}>Drop mascot.png here</Text>
```

## With this:

```tsx
<Image 
  source={require('../../assets/images/mascot.png')}
  style={styles.mascotImage}
  resizeMode="contain"
/>
```

## Requirements
- PNG format recommended
- Transparent background preferred  
- Minimum 120x120px (will scale automatically)

The current build uses a rocket emoji fallback to prevent errors.