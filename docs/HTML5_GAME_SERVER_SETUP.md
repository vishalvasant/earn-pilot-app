# HTML5 Game – Production Server Setup

The app’s **Arcade** game is **Stickman Hook** (loaded from `HTML5_GAME_URL` in config). This doc describes how to host your own HTML5 game (e.g. Cut the Rope) on your server and point the app at it.

---

## 1. What to upload

Upload the **entire `cuttherope` folder** with the same structure. From the app repo that is:

**Source folder:** `earn-pilot-app/games/cuttherope/`

Upload everything inside it so the server has this structure:

```
cuttherope/
├── index.html          ← Entry point (required)
├── css/
│   ├── ctr.css
│   ├── nojavascript.css
│   └── nosupport.css
├── scripts/
│   ├── ctr.js
│   ├── libraries.js
│   └── sm2.js
├── sm2/                 ← Sound manager (JS files)
├── audio/               ← Sound assets (.mp3, etc.)
├── video/               ← intro_1024.mp4, outro_1024.mp4
├── images/              ← All image subfolders (page/, 768/, etc.)
├── fonts/               ← Font files if any
├── cursors/             ← Cursor images if any
├── README.md            ← Optional
└── .gitattributes       ← Optional
```

**Quick copy:** Upload the whole `games/cuttherope` directory as-is (e.g. via FTP/SFTP, or zip it and extract on the server).

---

## 2. Where to put it on the server

Choose a URL path and put the folder there. Examples:

| Option | URL path | Full game URL |
|--------|----------|----------------|
| A | `/games/cuttherope/` | `https://your-domain.com/games/cuttherope/index.html` |
| B | `/static/games/cuttherope/` | `https://your-domain.com/static/games/cuttherope/index.html` |
| C | Subdomain | `https://games.your-domain.com/cuttherope/index.html` |

The app must open the **full URL to `index.html`** (e.g. `https://your-domain.com/games/cuttherope/index.html`).

---

## 3. Server requirements

### 3.1 Static file serving

- Serve the `cuttherope` directory as **static files** (no server-side rendering).
- No special backend logic; the browser loads `index.html`, which then loads CSS/JS/images via relative paths.

### 3.2 MIME types

The server must send correct **Content-Type** headers so the WebView renders the game (and not the HTML as plain text):

| Extension | Content-Type |
|-----------|--------------|
| `.html` | `text/html` |
| `.css` | `text/css` |
| `.js` | `application/javascript` |
| `.json` | `application/json` |
| `.png` | `image/png` |
| `.jpg`, `.jpeg` | `image/jpeg` |
| `.gif` | `image/gif` |
| `.mp3` | `audio/mpeg` |
| `.mp4` | `video/mp4` |
| `.woff`, `.woff2` | `font/woff`, `font/woff2` |
| `.ttf` | `font/ttf` |

Most servers (Nginx, Apache, etc.) already do this by extension; just avoid forcing `Content-Type: text/plain` for `.html`/`.js`/`.css`.

### 3.3 HTTPS

- Use **HTTPS** for the game URL in production (required for mixed content and many WebViews).

### 3.4 CORS (if needed)

- If the game is on a different domain than your API, the WebView may need the server to allow requests from your app. For a normal “open this URL in WebView” flow, **no CORS headers are usually required**. Only if you later add JS that fetches from your API from inside the game page would you need CORS on the API.

### 3.5 No special headers for the app

- You do **not** need to set any custom headers for the Earn Pilot app; standard static hosting is enough.

---

## 4. Example: Nginx

If you use Nginx, point a location to the folder:

```nginx
# e.g. inside a server { } block
location /games/cuttherope/ {
    alias /var/www/your-site/games/cuttherope/;   # or your actual path
    # Optional: cache static assets
    add_header Cache-Control "public, max-age=86400";
}
```

Then the game URL is: `https://your-domain.com/games/cuttherope/index.html`

---

## 5. Example: Apache

```apache
# DocumentRoot or VirtualHost
Alias /games/cuttherope /var/www/your-site/games/cuttherope
<Directory /var/www/your-site/games/cuttherope>
    Require all granted
    Options -Indexes
</Directory>
```

---

## 6. After upload – checklist

1. Open in a browser: `https://your-domain.com/games/cuttherope/index.html` (replace with your path).
2. Confirm the game loads and plays (not the raw HTML code).
3. Put the **exact same URL** in the app config (see below).

---

## 7. App config

In `earn-pilot-app/config/app.ts` set:

```ts
HTML5_GAME_URL: 'https://your-domain.com/games/cuttherope/index.html',
```

The app uses this URL when opening the Arcade game. If this is empty or missing, the app falls back to the default (Stickman Hook on networks11).
