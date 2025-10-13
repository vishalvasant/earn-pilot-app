# Earn Pilot Mobile (Expo + TypeScript)

Cross-platform Play & Earn mobile app using Expo Router, Zustand, and Axios.

## Requirements
- Node.js 18+
- Expo CLI (auto-installed via `npx`)

## Environment
Set API base URL in `app.config.ts` under `extra.API_BASE_URL`.

## Scripts
- `npm run start` — start Expo dev server
- `npm run ios` — run on iOS simulator
- `npm run android` — run on Android emulator/device
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript project check

## Auth Flow
- Phone login: POST /api/auth/send-otp
- Verify OTP: POST /api/auth/verify-otp (stores token)

## Tabs
- Home, Tasks, Wallet, Profile

## Notes
- This is a base scaffold. Replace placeholder UI assets with final design.