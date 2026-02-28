# HTML5 Games (bundled)

**Cut the Rope** – source: [HTML5GameArchive/gfiles – games/cuttherope](https://github.com/HTML5GameArchive/gfiles/tree/master/games/cuttherope)

- **Android**: A copy is in `android/app/src/main/assets/games/cuttherope/` and is loaded from the app bundle (`file:///android_asset/...`).
- **iOS**: The app loads the game from the CDN. To bundle locally, add this `games` folder to the Xcode project (Create folder reference) and include it in **Copy Bundle Resources**, then use the bundle path in the WebView.

To refresh the game from the repo, re-copy from the cloned `gfiles` repo or re-download from GitHub.
