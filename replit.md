# XpoGo — Streaming Platform

## Overview

Full streaming platform (Netflix-style) powered by TMDB data with embedded player via zxcstream.xyz, admin panel, Firebase Realtime Database for settings/ads/embeds/custom movies, and Expo mobile app.

The **web app and mobile app are fully independent** — they call TMDB and Firebase directly, with no dependency on the API server. The API server exists as a standalone backend but is NOT required for the web or mobile apps.

## Stack

- **Monorepo**: pnpm workspaces, TypeScript 5.9
- **API Server**: Express 5 (`artifacts/api-server`) — standalone, not required by web/mobile
- **Web App**: React + Vite + Tailwind (`artifacts/xpogo`) — 100% static SPA, deployable to Vercel or Firebase Hosting
- **Mobile App**: Expo React Native (`artifacts/xpogo-mobile`)
- **Database**: Firebase Realtime Database (`apps-tmdb`, Asia Southeast 1) via REST API
- **TMDB**: Direct API calls from both web and mobile (no proxy server needed)

## Artifacts

| Artifact | Path | Description |
|---|---|---|
| `artifacts/api-server` | `/api` | Standalone Express backend (optional) |
| `artifacts/xpogo` | `/` | Web streaming app — static SPA, deploys to Vercel/Firebase Hosting |
| `artifacts/xpogo-mobile` | `/mobile` | Expo mobile app |

## Key Features

- **Home page** — Hero banner, Trending/Popular/Top-Rated rows from TMDB
- **Movie page** — Detail + embedded player (`zxcstream.xyz/player/movie/{id}`)
- **TV page** — Detail + season/episode picker + embedded player (`zxcstream.xyz/player/tv/{id}/{s}/{e}`)
- **Search** — Multi-search (movies + TV) with debounce
- **Admin panel** (`/admin`) — Login with password stored as SHA-256 hash in Firebase `admin/passwordHash`
  - **Settings**: player color, server, domainAd, poster size, font, autoplay
  - **Ads Manager**: banner-top (sticky atas), banner-bottom (sticky bawah), popunder
  - **Manual Embeds**: custom embed URLs (movie/series), with subtitle lang & TMDB ID
  - **Custom Movies**: manual movies with poster/backdrop/embed URL, TMDB Lookup widget

## Player URL Pattern

```
Movie: https://zxcstream.xyz/player/movie/{tmdbId}?server=1&color=E50914&autoplay=true&back=true
TV:    https://zxcstream.xyz/player/tv/{tmdbId}/{season}/{episode}?server=1&color=E50914&autoplay=true&back=true
```

## Ads System

Ads are stored in Firebase `ads/`. Types:
- `banner-top` — sticky `position: fixed; top: 0` full width, injects HTML via `dangerouslySetInnerHTML`
- `banner-bottom` — sticky `position: fixed; bottom: 0` full width
- `popunder` — injects `<script>` tags once per session (via `sessionStorage`)

## Firebase

- **Project**: `apps-tmdb`
- **DB URL**: `https://apps-tmdb-default-rtdb.asia-southeast1.firebasedatabase.app`
- **Auth**: REST API with `FIREBASE_DB_SECRET` for admin writes; public reads (no auth needed)
- **Paths**: `settings/`, `ads/`, `embeds/`, `custom_movies/`, `admin/passwordHash`

## Environment Secrets (Replit)

| Secret | Used in | Purpose |
|---|---|---|
| `TMDB_API_KEY` | api-server, web (as `VITE_TMDB_KEY`), mobile (as `EXPO_PUBLIC_TMDB_KEY`) | TMDB API access |
| `FIREBASE_DB_SECRET` | api-server, web (as `VITE_FIREBASE_SECRET`), mobile (as `EXPO_PUBLIC_FIREBASE_SECRET`) | Firebase admin writes |
| `ADMIN_PASSWORD` | api-server only | Admin login for API server |

## Web App Deployment (Vercel / Firebase Hosting)

The web app builds to a **static SPA** (`dist/public/`). Set these env vars in your hosting platform:

```
VITE_TMDB_KEY=<your TMDB API key>
VITE_FIREBASE_SECRET=<your Firebase DB secret>
```

**Build command**: `pnpm --filter @workspace/xpogo run build`
**Output directory**: `artifacts/xpogo/dist/public`
**SPA routing**: add rewrite rule `/* → /index.html`

### Vercel `vercel.json`
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Firebase Hosting `firebase.json`
```json
{
  "hosting": {
    "public": "artifacts/xpogo/dist/public",
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

## Firebase Database Rules (apply in Firebase Console)

```json
{
  "rules": {
    ".read": true,
    ".write": false,
    "settings":      { ".read": true, ".write": "auth != null" },
    "ads":           { ".read": true, ".write": "auth != null" },
    "custom_movies": { ".read": true, ".write": "auth != null" },
    "embeds":        { ".read": true, ".write": "auth != null" },
    "admin":         { ".read": "auth != null", ".write": "auth != null" }
  }
}
```

## Key Commands

```bash
pnpm --filter @workspace/xpogo run dev     # run web app (maps TMDB_API_KEY + FIREBASE_DB_SECRET)
pnpm --filter @workspace/xpogo run build   # build static SPA for deployment
pnpm --filter @workspace/api-server run dev # run API server (optional)
```

## File Structure

```
artifacts/
  xpogo/src/
    lib/
      firebase.ts     Firebase REST helper (fbGet/fbSet/fbPush/fbPatch/fbDelete + fb.* methods)
      tmdb.ts         TMDB direct fetch helper (tmdb.* methods)
      auth.ts         localStorage token manager (xpogo_admin_token)
    pages/
      home.tsx        Hero + content rows (useQuery + tmdb/fb)
      movie.tsx       Movie detail + player
      tv.tsx          TV detail + season/episode picker
      search.tsx      Multi-search with debounce
      admin.tsx       Full admin panel (Settings/Ads/Embeds/Custom Movies tabs)
    components/
      Navbar.tsx      Sticky navigation
      MovieCard.tsx   Poster card with hover
      ContentRow.tsx  Horizontal scrollable row
      AdBanner.tsx    Banner top/bottom/popunder injector
  xpogo-mobile/
    lib/
      firebase.ts     Mobile Firebase REST helper (expo-crypto for SHA-256)
      tmdb.ts         Mobile TMDB helper
    app/(tabs)/
      index.tsx       Home screen
      search.tsx      Search screen
  api-server/src/     Standalone Express backend (not required by web/mobile)
```
