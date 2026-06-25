# 🎵 Spotify Clone — Mobile App + Admin Panel

A full demo music-streaming stack:

| Part | Tech | What it does |
|------|------|--------------|
| **backend/** | Node + Express | Song API: list/search songs, latest-by-language, categories, home feed, admin CRUD. JSON-file storage, pre-seeded. |
| **admin/** | React (Vite) | Web admin panel: add / edit / delete songs, filter by language & category, fetch "latest songs". |
| **mobile/** | React Native (Expo) | Spotify-style app: language preference, home shelves, browse-by-category, search, audio player. |

The mobile app and the admin panel both talk to the **same backend**, so a song you add in
the admin panel shows up in the app.

---

## Categories included

`90's`, `2000's`, `Venkatesh Hits`, `Ajith Hits`, `Telugu`, `Hindi`, `English`, `Tamil`,
`Sankranthi Special`, `DJ / Remix`, `Friendship`, `Love / Melody`, `Workout`.

Languages: Telugu, Hindi, English, Tamil, Kannada. A song can belong to many categories
(e.g. a Venkatesh song is also `telugu` + `90s`).

---

## 1. Start the backend (do this first)

```bash
cd backend
npm install
npm start          # → http://localhost:4000
```

Quick check: open <http://localhost:4000/api/home> in a browser.
To reset the catalogue to seed data: `curl -X POST localhost:4000/api/admin/reseed`.

### Key endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/home?language=telugu` | Home feed (latest + category shelves) |
| GET | `/api/songs?language=hindi&category=dj&q=tum` | Filtered/searched list |
| GET | `/api/songs/latest?language=telugu` | Latest songs by language |
| GET | `/api/categories` · `/api/languages` | Reference lists |
| POST/PUT/DELETE | `/api/songs[/:id]` | Admin create/update/delete |

---

## 2. Run the admin panel

```bash
cd admin
npm install
npm run dev        # → http://localhost:5173
```

Add songs, tag them with categories & a language, toggle **Latest songs**, filter, edit, delete.

---

## 3. Run the mobile app

```bash
cd mobile
npm install
npm start          # opens Expo — press i (iOS), a (Android), or w (web)
```

**Important — pointing the app at your backend** (`mobile/src/config.js`):
- **iOS simulator** → `http://localhost:4000` works out of the box.
- **Android emulator** → uses `http://10.0.2.2:4000` automatically.
- **Physical phone (Expo Go)** → set `LAN_IP` in `config.js` to your computer's IP
  (`ipconfig getifaddr en0` on macOS) and use the iOS real-device line noted in that file.
  Phone and computer must be on the same Wi-Fi.

### What you can do in the app
- **Onboarding** — pick a preferred language (or "Skip" for all).
- **Home** — "Latest releases" + a shelf per category; language chips switch the feed.
- **Browse** — grid of every category → tap to see all its songs → "Play all".
- **Search** — find songs/artists.
- **Library** — the full flat catalogue (all songs, newest first).
- **Player** — tap the mini-player for the full-screen player (play/pause, next/prev, seek).
  Audio uses free SoundHelix sample MP3s so playback actually works.

---

## Notes
- Storage is a single `backend/data.json` file (created on first run) — fine for a demo,
  swap for a real DB (Mongo/Postgres) for production.
- Cover art uses `picsum.photos`; audio uses `soundhelix.com` samples. Both need internet.
- This is a learning/demo project and is **not** affiliated with Spotify.
