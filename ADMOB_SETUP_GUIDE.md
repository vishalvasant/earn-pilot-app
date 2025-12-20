# AdMob Integration Setup & Testing Guide

## ✅ What Has Been Fixed

### 1. **Test ID Configuration** (`services/admob.ts`)
- ✅ Using official Google Test IDs from AdMob Documentation
- ✅ Test IDs are now CONSTANTS not overridable by module import
- ✅ FORCE_TEST_MODE = true ensures test IDs everywhere

**Official Google Test IDs:**
- **App ID (Android):** `ca-app-pub-3940256099942544~3347511713` *(in app.json)*
- **App ID (iOS):** `ca-app-pub-3940256099942544~1458002511` *(in app.json)*
- **Banner Ad:** `ca-app-pub-3940256099942544/6300978111`
- **Interstitial Ad:** `ca-app-pub-3940256099942544/1033173712`
- **Rewarded Ad:** `ca-app-pub-3940256099942544/5224354917`
- **Native Ad:** `ca-app-pub-3940256099942544/2247696110`
- **App Open Ad:** `ca-app-pub-3940256099942544/5662855259`

### 2. **Backend Config Response** (`services/admob.ts`)
- ✅ Fixed API response parsing: `response.data?.config` (was incorrectly `response.data?.data`)
- ✅ Backend returns proper test IDs when test_mode is enabled
- ✅ Fallback config uses Google test IDs if backend call fails

### 3. **useAdMob Hook** (`hooks/useAdMob.ts`)
- ✅ `shouldShowBanner` is now state-based, not a computed value
- ✅ Updates when config is loaded
- ✅ Reactive to initialization changes

### 4. **Enhanced Logging** (Throughout `services/admob.ts`)
- ✅ Detailed console logs for debugging (see Console Output section below)
- ✅ Emojis for easy identification
- ✅ Logs show: module availability, initialization status, ad visibility, config state

### 5. **NDK & Build Configuration** 
- ✅ `app.json` updated to NDK 26.1.10909125 (was 25.2.9519653)
- ✅ `android/gradle.properties` aligned to NDK 26.1.10909125
- ✅ `android/local.properties` cleaned (removed deprecated ndk.dir)
- ✅ APK built successfully with dev-client support

---

## 🧪 Testing Instructions

### **Step 1: Prepare Backend**
Ensure your Laravel backend is running and AdMob Settings are configured:
```bash
cd /Users/vishal/Desktop/11Tech/earn-pilot-admin
php artisan serve
```

Then open admin panel and go to AdMob Settings:
- Enable: `is_enabled` ✓
- Enable Test Mode: `test_mode` ✓  
- Enable: `show_banner_ads`, `show_interstitial_ads`, `show_rewarded_ads` ✓

### **Step 2: Install APK on Device/Emulator**
```bash
adb install -r /Users/vishal/Desktop/11Tech/earn-pilot-app/android/app/build/outputs/apk/debug/app-debug.apk
```

### **Step 3: Start Dev Client**
```bash
cd /Users/vishal/Desktop/11Tech/earn-pilot-app
npx expo start --dev-client
```

Then:
- Open app on device/emulator
- Scan QR code or select "Run in Android Emulator"

### **Step 4: Watch Console Logs**
Open Chrome DevTools or native debugger to see console output:
```
✅ AdMob module loaded successfully
🚀 Initializing AdMob with Google Test IDs
✅ Google Mobile Ads SDK initialized
✅ AdMob config fetched from backend
📋 AdMob Config: enabled=true, banners=true, interstitials=true, rewarded=true
🎯 shouldShowBannerAd: true
🎁 Loading rewarded ad with ID: ca-app-pub-3940256099942544/5224354917
✅ AdMob fully initialized and ready
```

---

## 📱 Testing Checklist

### **Home Screen**
- [ ] Banner ad appears at bottom (from Google: "Google AdMob Test Banner")
- [ ] Open Chrome DevTools → Console should show: `🎯 shouldShowBannerAd: true`

### **Tasks Screen**
- [ ] Banner ad appears at bottom
- [ ] Click any task → Interstitial ad should show before navigation
- [ ] Console shows: `🎬 Showing interstitial ad...`
- [ ] After interstitial closes, task detail opens
- [ ] "Start Task" button shows interstitial
- [ ] "Complete Task" button shows another interstitial

### **Wallet Screen**
- [ ] Banner ad appears at bottom  
- [ ] "🎁 Watch Ad & Earn +50 Points" button is visible
- [ ] Click button → Rewarded ad should appear
- [ ] Watch ad until completion → Rewards popup appears
- [ ] Points balance increases by 50

### **Subtask Flows** (in Task Detail)
- [ ] Clicking subtask link shows interstitial before WebView opens
- [ ] Completing subtask shows interstitial before API call

---

## 🔍 Console Output Examples

### **✅ Successful Initialization**
```
✅ AdMob module loaded successfully
🚀 Initializing AdMob with Google Test IDs
✅ Google Mobile Ads SDK initialized
✅ AdMob config fetched from backend: {
  is_enabled: true,
  test_mode: true,
  show_banner_ads: true,
  show_interstitial_ads: true,
  show_rewarded_ads: true,
  banner_ad_id: "ca-app-pub-3940256099942544/6300978111",
  interstitial_ad_id: "ca-app-pub-3940256099942544/1033173712",
  rewarded_ad_id: "ca-app-pub-3940256099942544/5224354917",
  ...
}
✅ AdMob fully initialized and ready
```

### **⏭️ Interstitial Ad Flow**
```
⏭️ Loading interstitial ad with ID: ca-app-pub-3940256099942544/1033173712
✅ Interstitial ad loaded
🎬 Showing interstitial ad...
❌ Interstitial ad closed
⏭️ Loading interstitial ad with ID: ca-app-pub-3940256099942544/1033173712
```

### **🎁 Rewarded Ad Flow**
```
🎁 Loading rewarded ad with ID: ca-app-pub-3940256099942544/5224354917
✅ Rewarded ad loaded
🎬 Showing rewarded ad...
❌ Rewarded ad closed
🎁 Loading rewarded ad with ID: ca-app-pub-3940256099942544/5224354917
```

---

## ❌ Troubleshooting

### **Problem: No ads showing**

**Check 1: Is AdMob module loaded?**
```
Look for: ✅ AdMob module loaded successfully
If not: ⚠️ AdMob module not available (running in Expo Go)
  → Solution: Use dev-client build, not Expo Go
```

**Check 2: Is initialization complete?**
```
Look for: ✅ AdMob fully initialized and ready
If not: ❌ Failed to initialize AdMob: [error]
  → Check backend connectivity
  → Check app.json plugin configuration
```

**Check 3: Is backend returning correct config?**
```
Test manually:
curl "http://127.0.0.1:8000/api/admob/config?platform=android"

Expected response:
{
  "success": true,
  "config": {
    "is_enabled": true,
    "test_mode": true,
    "show_banner_ads": true,
    ...
  }
}
```

**Check 4: Are banners enabled in admin panel?**
```
Go to: Admin Panel → AdMob Settings
- ✓ is_enabled
- ✓ show_banner_ads
- ✓ show_interstitial_ads  
- ✓ show_rewarded_ads
- ✓ test_mode
```

### **Problem: Banners showing but not working**

**Check: Is native module available?**
```
Look for: ✅ AdMob module loaded successfully
If not: Use dev-client, not Expo Go
```

**Check: Correct test IDs?**
```
Look for: Using Google test banner ID: ca-app-pub-3940256099942544/6300978111
If different: Update in services/admob.ts GOOGLE_TEST_IDS
```

---

## 📋 Configuration Files

### **app.json**
- ✅ AdMob plugin configured with Google App IDs
- ✅ NDK version: 26.1.10909125

### **services/admob.ts**
- ✅ GOOGLE_TEST_IDS constants defined
- ✅ FORCE_TEST_MODE = true
- ✅ Detailed logging throughout

### **hooks/useAdMob.ts**
- ✅ Banner visibility managed as state
- ✅ Reactive to config changes

### **Backend** (`laravel/app/Http/Controllers/Api/AdMobController.php`)
- ✅ Returns Google test IDs when test_mode = true
- ✅ Response format: `{ success: true, config: {...} }`

---

## 🚀 Next Steps

1. **Install APK** from `/android/app/build/outputs/apk/debug/app-debug.apk`
2. **Start dev server** with `npx expo start --dev-client`
3. **Open app** and watch console for AdMob logs
4. **Test all flows**: Navigate, watch ads, see points awarded
5. **Report any issues** with console logs attached

---

## 📞 Support

If ads still don't appear:
1. Share console logs (search for 🎯, 🎬, 🎁 emojis)
2. Confirm backend is returning correct test IDs
3. Verify device has Google Play Services installed (for emulator, use Google Play image not AOSP)
