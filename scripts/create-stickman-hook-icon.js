#!/usr/bin/env node
/**
 * Creates a placeholder PNG at assets/images/stickman-hook-icon.png so the app builds.
 * Replace that file with your Stickman Hook logo (same path) to show the real icon.
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'assets', 'images');
const file = path.join(dir, 'stickman-hook-icon.png');
// Minimal valid 1x1 transparent PNG (67 bytes)
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}
fs.writeFileSync(file, Buffer.from(pngBase64, 'base64'));
console.log('Created:', file);
console.log('Replace it with your Stickman Hook logo to use the custom icon.');
