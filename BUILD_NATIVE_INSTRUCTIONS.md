# Building Native Google Sign-In Support

## Problem
The error `'RNGoogleSignin' could not be found` happens because:
- `@react-native-google-signin/google-signin` requires **native code compilation**
- Expo Go cannot run native modules
- Need a development build with compiled native code

## Solution: Build with EAS

### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
```

### Step 2: Login to Expo
```bash
eas login
```

### Step 3: Build for Android (Recommended)
```bash
cd /Users/vishal/Desktop/11Tech/earn-pilot-app
eas build --platform android --profile preview
```

**What happens:**
- Compiles native modules (GoogleSignin, Firebase, etc.)
- Creates an APK file
- Takes 5-10 minutes
- Uploads to Expo servers

### Step 4: Run on Emulator
After build completes:
```bash
# Download APK from build link
# Then install
adb install /path/to/downloaded.apk
```

## Current System Status
- ✅ Backend API: Ready (port 8000)
- ✅ Database: Ready (MySQL)
- ✅ App Code: Ready (Google Sign-In only)
- ⏳ Native Build: Needed for RNGoogleSignin

## After Build Completes
1. APK will install on Android emulator automatically
2. App will have Google Sign-In working
3. Can authenticate with real Google account
4. Data will save to backend MySQL database

## Alternative: Local Build
```bash
eas build --platform android --local
```
(Requires Android NDK configured)

## Test Flow After Build
1. App launches
2. Tap "Sign in with Google"
3. Select Google account
4. Redirects to home screen
5. Data syncs with backend

---

## Add-on games: Play vs Download (Android)

The app uses **react-native-check-app-install** to detect if an add-on game (by package name from admin) is installed, so it can show **Play** instead of **Download**.

- **Rebuild required:** After adding this package, run a fresh native build (e.g. `npx react-native run-android` or your APK build) so the native module is compiled.
- **Android 11+ (API 30+):** If the install check always shows "Download" on newer devices, add package visibility to your `android/app/src/main/AndroidManifest.xml` inside `<manifest>`:

```xml
<queries>
  <intent>
    <action android:name="android.intent.action.MAIN" />
    <category android:name="android.intent.category.LAUNCHER" />
  </intent>
</queries>
```

This lets the app query whether other launcher apps (including add-on games) are installed.
