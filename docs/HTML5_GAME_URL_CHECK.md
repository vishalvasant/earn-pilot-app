# HTML5 game URL check (Om Nom Bounce & Stack Ball)

Checked **2026-03** against production URLs. Issues are on the **game/server side**, not the app.

---

## Om Nom Bounce — `https://networks11.com/public/games/omnombounce/`

### Working
- Root and `index.html`: **200**
- `version.js`, `om_nom_bounce.min.js`: **200**
- `assets/icon.png`, `assets/css/app.css`: **200**

### Issue: Cloudflare challenge in HTML
The page includes a **Cloudflare challenge / bot-protection script** (e.g. `__CF$cv$params`, `/cdn-cgi/challenge-platform/...`, `invisible.js`). In an in-app WebView this often:
- Never completes (different UA / environment)
- Blocks or delays the rest of the page
- Prevents the game script from running

**Fix (server / hosting):**
- Exclude the game path from Cloudflare “Under Attack” / challenge (e.g. Page Rules or Configuration Rules: disable challenge for `/public/games/omnombounce/*`), **or**
- Serve the game from a subdomain/path that does not go through Cloudflare challenge.

### Issue 2: Missing game assets (404) — causes crash
Browser console shows these requests returning **404**. The spine assets are required for the level-select screen; when they fail, the game throws:

```text
Uncaught TypeError: Cannot read properties of undefined (reading 'skeleton')
  at readSkeletonData → createSkeletonData → getSkeletonData → getThreeMesh → init → bootScene ...
```

**Missing files to add under the Om Nom Bounce game root** (e.g. `public/games/omnombounce/`):

| Path | Purpose |
|------|--------|
| `assets/images/Splash_desktop.png` | Splash/loading image |
| `assets/spines/levelSelect/Om_Nom.atlas` | Spine atlas for Om Nom character (level select) |
| `assets/spines/levelSelect/Om_Nom.json` | Spine skeleton JSON for Om Nom (level select) |

**Fix:** Upload or copy these files from the original Om Nom Bounce build into the same relative paths. Without `Om_Nom.atlas` and `Om_Nom.json`, the game cannot create the skeleton data and crashes.

**Other console messages (non-blocking):** Canvas2D `willReadFrequently` is a performance hint. "AudioContext must be resumed after user gesture" is Chrome autoplay policy; no server fix needed.

---

## Stack Ball — `https://networks11.com/public/games/stackball/`

### Working
- Root and `index.html`: **200**
- `UnityLoader.js`, `StackBall2_GDistribution.json`: **200**
- Unity assets: **200**
  - `StackBall2_GDistribution.data.unityweb`
  - `StackBall2_GDistribution.wasm.code.unityweb`
  - `StackBall2_GDistribution.wasm.framework.unityweb`
- `jquery-3.5.0.min.js`, `progress.js`, `animate.css`: **200**

### Issue 1: Cloudflare script 404 (wrong URL)
Browser requests:
```text
GET https://networks11.com/public/ajax.cloudflare.com/cdn-cgi/scripts/.../mirage2.min.js net::ERR_ABORTED 404
```
The script URL is being resolved **relative to the current path**, so the host becomes `networks11.com/public/` instead of `ajax.cloudflare.com`. The Stack Ball HTML likely has a script tag like `src="ajax.cloudflare.com/..."` or `src="//ajax.cloudflare.com/..."` without a proper protocol/host, or it was injected by Cloudflare in a way that breaks on this path.

**Fix (server / game deploy):**
- **Preferred:** Remove the Cloudflare mirage2 (or any `cdn-cgi/scripts/...`) script tag from `stackball/index.html` so the game page does not depend on it. Game content should load without it.
- **Alternative:** Replace the script `src` with the full absolute URL: `https://ajax.cloudflare.com/cdn-cgi/scripts/04b3eb47/cloudflare-static/mirage2.min.js` (only if you really need that script).

### Issue 2: Missing image (404)
- **`assets/images/gamelogo.png`** → **404**  
  Referenced in CSS as loading-screen background (`url(assets/images/gamelogo.png)`). The game can still load; the loading screen may show a broken/missing background image.

**Fix (server / game deploy):**
- Add the file at `stackball/assets/images/gamelogo.png`, **or**
- Change the CSS to use an existing image (e.g. `logo.png` in the root) or remove the background.

---

## Summary

| Game           | URL status | Issue |
|----------------|-----------|--------|
| Om Nom Bounce  | 200       | Cloudflare `invisible.js` 404; **missing assets** (404): `assets/images/Splash_desktop.png`, `assets/spines/levelSelect/Om_Nom.atlas`, `assets/spines/levelSelect/Om_Nom.json` — missing spine assets cause `reading 'skeleton'` crash. Add files from game build. |
| Stack Ball     | 200       | **1)** Cloudflare `mirage2.min.js` 404 (script URL resolved wrong: `networks11.com/public/ajax.cloudflare.com/...`). Remove that script from `stackball/index.html` or use absolute `https://ajax.cloudflare.com/...` URL. **2)** Missing `assets/images/gamelogo.png` (404). Add file or update CSS. |

After fixing the server/game deploy, reload the game in the app; no app change required for these items.
