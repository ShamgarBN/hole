# 🕳️ Voidling

A chill, **ad-free** hole.io-style time killer for your phone, rendered as a **3D voxel world**. Every object — towers, trees, cars, crates — is built from tiny cubes. Drag anywhere to steer the hole; as your edge passes over something you're big enough for, its cubes **break apart and tumble in** one at a time. You grow steadily, and higher tiers are made of **chunkier cubes**, so the world gets blockier as you climb.

- **No ads, no tracking, no network needed** once it's saved to your phone.
- **True 3D** (WebGL via Three.js, bundled locally — still fully offline).
- **12 themed worlds** (Downtown, Beach, Candy Land, Orbit Station, Dino Valley, …), each procedurally reshuffled every play.
- **Steady, calm growth** — the hole climbs at a rate-limited pace toward a ~2.5-minute finale, never spiking, so it stays relaxing.
- **Two moods:** Zen (no timer, just vibe) and Timed (2-minute score chase).
- Installs to your home screen as a full-screen app (PWA) and runs offline.

## Files
- `index.html` — UI, menus, HUD
- `game.js` — the engine (voxel generation, break-apart physics, camera, controls)
- `three.min.js` — the 3D library, vendored locally for offline use
- `manifest.json` + `sw.js` — make it installable & offline
- `icon-*.png` — app icons

## How to get it on your phone

It's a plain static web app — no build step. You just need to serve the folder over HTTPS (or localhost) so the "Add to Home Screen" / offline features work. Three options, easiest first:

### Option A — Free static host (recommended, 2 minutes)
1. Go to **[netlify.com/drop](https://app.netlify.com/drop)** (or Cloudflare Pages / GitHub Pages / Vercel).
2. Drag this whole `hole-claude` folder onto the page.
3. You get a URL like `https://something.netlify.app`. Open it on your phone.
4. **iPhone:** Share button → *Add to Home Screen*. **Android:** menu → *Install app* / *Add to Home Screen*.
5. Launch it from the icon — it now runs full-screen, offline, no ads, forever.

### Option B — Same Wi-Fi, no hosting
On your computer, from inside this folder:
```bash
python3 -m http.server 8000
```
Find your computer's local IP (`ipconfig getifaddr en0` on a Mac), then on your phone open `http://THAT-IP:8000`. Good for trying it out; note iOS limits "Add to Home Screen" offline mode to HTTPS, so Option A is better for permanent install.

### Option C — Just open the file
You can even open `index.html` directly in a phone browser (e.g. AirDrop the folder), though the offline/install niceties need a real host (Option A).

## Playing
- **Drag anywhere** and hold a direction — the hole glides that way. Release to coast.
- Roll over anything you're big enough for and its cubes crumble in; you grow with every bite. Bigger structures block you until you've grown enough to take them.
- Pause (❚❚) anytime. Your best score is saved on the device.

Wind down. 🌙
