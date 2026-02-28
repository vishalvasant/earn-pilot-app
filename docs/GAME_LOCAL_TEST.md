# Test Arcade game (Stickman Hook) locally

Use this to check aspect ratio and fit **before going live** when you host the game yourself.

## Current setup

The app’s **Arcade** card opens **Stickman Hook** from:

- **Production:** `https://networks11.com/public/games/stickmanhook/` (set in `config/app.ts` as `HTML5_GAME_URL`).

## 1. Serve the game from your machine (optional)

If you host Stickman Hook (or another HTML5 game) locally:

From the folder that contains the game’s `index.html`:

```bash
npx serve . -p 8080
```

Or for the legacy Cut the Rope bundle in the repo:

```bash
npm run serve:game
```

This serves at **http://localhost:8080/** (port 8080). Leave this terminal running.

## 2. Point the app at the local game

**Android emulator:**

In `config/app.ts`, temporarily set:

```ts
HTML5_GAME_URL: 'http://10.0.2.2:8080/', // Local test
```

**Physical Android device (same Wi‑Fi):**

- Find your machine’s IP (e.g. `192.168.1.5`).
- Use: `HTML5_GAME_URL: 'http://192.168.1.5:8080/',`

## 3. Run the app

```bash
npm start
```

Then (same or another terminal):

```bash
npm run android
```

## 4. Check aspect ratio and fit

1. In the app, open **Stickman Hook** (Home → Arcade).
2. The game runs in **normal mode** (no forced landscape; uses device orientation).
3. Check:
   - Game is **centered** on the screen.
   - Game **fits** the screen (no stretching; black letterboxing if needed).
   - **Aspect ratio** looks correct.

## 5. Switch back to production

When done testing, in `config/app.ts` restore:

```ts
HTML5_GAME_URL: 'https://networks11.com/public/games/stickmanhook/',
```
