# Assets - Images

## Mascot Image Setup

To use your mascot image in the login screen:

1. **Save the mascot image** as `mascot.png` in this directory (`/assets/images/mascot.png`)
2. **Replace the placeholder file** with your actual mascot image
3. **Image specifications:**
   - Recommended size: 512x512px or larger (will be scaled to 120x120)
   - Format: PNG with transparent background preferred
   - The image will be centered and animated with bounce/tilt effects

## Current Integration

- The login screen (`app/(auth)/login.tsx`) loads the mascot from `require('../../assets/images/mascot.png')`
- The image is displayed in a 140x140 circular container with a subtle border
- Animations: gentle bounce (vertical) and tilt (rotation) for a playful feel

## Fallback

If the image fails to load, the app might show an error. Consider keeping a fallback emoji version for development.