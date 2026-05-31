# Atlas Song Contest — Static PWA Build

This version removes the Node/Express backend and runs as a frontend-only React/Vite app.

## What works

- iPad Safari
- Add to Home Screen PWA mode
- Season creation
- Drafting countries
- Local song/profile generation
- 60 local image prompts per country
- Local generated SVG cover art
- Voting simulation
- Local browser storage
- Free static hosting

## What changed

The Gemini API calls were removed because a static public website cannot safely keep a private API key. The app now uses the existing local fallback generators instead.

## Run on a PC/Mac for testing

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The deployable site is created in `dist/`.

## Free hosting options

### Cloudflare Pages
Build command:

```bash
npm run build
```

Output directory:

```bash
dist
```

### Netlify
Build command: `npm run build`  
Publish directory: `dist`

### Vercel
Framework preset: `Vite`  
Build command: `npm run build`  
Output directory: `dist`

### GitHub Pages
Run `npm run build` and publish the contents of `dist/`.

## iPad use

1. Open the hosted URL in Safari.
2. Tap Share.
3. Tap Add to Home Screen.
4. Open it from the new icon.

