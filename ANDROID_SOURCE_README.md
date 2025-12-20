# Earn Pilot — Android Source Setup

This guide explains how another developer can open, run, and test the Android native project in Android Studio, and how to change the API URL for local/remote backends.

## Prerequisites
- Android Studio (Giraffe or newer). Use the bundled JDK 17 (recommended).
- Java 17 (required by Android Gradle Plugin). If using Android Studio, set Gradle JDK to the bundled JDK.
- Node.js LTS (>= 20.x) and npm.
- Android SDK Platform 34 (Android 14) or 35 (Android 15) + build tools.
- An Android emulator (AVD) or a physical Android device with USB debugging enabled.

## Project Contents
- `android/` — Native Android project (generated via Expo prebuild).
- `app/`, `components/`, `hooks/`, `services/`, etc. — React Native app code.
- `app.config.js` — App configuration (includes `extra.API_BASE_URL`).

## Getting the Source
Share the entire `earn-pilot-app/` folder (including the newly generated `android/` directory). Do NOT include `node_modules/`.

To create a zip (excluding large folders):

```bash
cd /path/to/11Tech
zip -r EarnPilot-android-source.zip earn-pilot-app \
  -x "**/node_modules/**" "**/.git/**" "**/.expo/**" "**/build/**"
```

## Install Dependencies
From the project root (`earn-pilot-app/`):

```bash
npm install
```

## Configure API URL
The app reads the API base URL from `app.config.js`:

- File: `app.config.js`
- Key: `extra.API_BASE_URL`

Examples:
- Emulator (host machine backend): `http://10.0.2.2:8000`
- Real device on same Wi‑Fi: `http://<your-machine-ip>:8000` (e.g., `http://192.168.31.157:8000`)
- Production: `https://networks11.com`

Notes:
- `services/api.ts` auto-maps `localhost`/`127.0.0.1` to `10.0.2.2` on Android emulators.
- After changing `API_BASE_URL`, simply restart the Metro server and the app.

## Running in Android Studio (Debug)
1. Start Metro bundler in a terminal:
   ```bash
   cd earn-pilot-app
   npm run start
   ```
2. Open `earn-pilot-app/android` in Android Studio.
3. Ensure Gradle JDK is set to Java 17:
   - File → Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK → "Embedded JDK" (or JDK 17)
4. Select the `app` configuration and press Run.

Debug build will connect to the Metro bundler and reflect JavaScript changes automatically.

## Building a Debug APK (optional)
From a terminal:

```bash
cd earn-pilot-app/android
./gradlew :app:assembleDebug
```

The APK will be at:
`earn-pilot-app/android/app/build/outputs/apk/debug/app-debug.apk`

## Building a Release APK (optional)
```bash
cd earn-pilot-app/android
./gradlew :app:assembleRelease
```

Unsigned APK output:
`earn-pilot-app/android/app/build/outputs/apk/release/app-release-unsigned.apk`

To distribute, create a signing config or use Android Studio’s signing flow.

## AdMob & Expo specifics
- AdMob is fully integrated natively. It won’t work in Expo Go—use this Android Studio project (debug/release).
- In debug builds, treat devices as test devices; test ad unit IDs are used as fallback if the API config isn’t available.
- No extra steps are required—prebuild has already linked the native module.

## Push Notifications (expo-notifications)
- Remote push in Expo Go is limited; use this native project for realistic testing.
- For FCM, ensure a proper Firebase setup if you need to test real push.

## Common Issues
- AGP requires Java 17: set Gradle JDK to the embedded JDK in Android Studio.
- Emulator cannot reach `localhost`: use `http://10.0.2.2:8000`.
- Real device cannot reach backend: ensure both are on the same network and the backend allows connections (firewall/CORS).

## Where to Edit
- API URL: `app.config.js` → `extra.API_BASE_URL`
- Ad placements: `app/(tabs)/*.tsx`, `app/task-detail.tsx`
- Ad service: `services/admob.ts`
- REST client: `services/api.ts`

That’s it. Open the Android project, run the Metro server, and press Run in Android Studio.
