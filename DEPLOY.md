# 🚀 Deploy remotely — 100% free

Goal: an **installable Android APK** that works on any phone, backed by a
**persistent free database** and a **free always-reachable API**.

```
MongoDB Atlas (free DB)  ←  Render (free API host)  ←  Android APK (EAS free build)
        persistent data         public https URL            installed on any phone
```

Three accounts, all free: **MongoDB Atlas**, **Render**, **Expo**. iOS installable
builds need a paid Apple Developer account ($99/yr) and are *not* covered here.

---

## A. Free database — MongoDB Atlas

1. Sign up at <https://www.mongodb.com/cloud/atlas/register>.
2. **Create a free cluster** → choose the **M0 (Free)** tier.
3. **Database Access** → add a database user (username + password). Save them.
4. **Network Access** → Add IP Address → **Allow access from anywhere** (`0.0.0.0/0`)
   so Render can connect.
5. **Connect → Drivers** → copy the connection string, e.g.
   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Replace `USER`/`PASSWORD` with the user you created. This is your **`MONGODB_URI`**.

The backend auto-seeds the catalogue into the DB on first boot and persists every
admin edit. (No `MONGODB_URI` set = it falls back to a local JSON file.)

---

## B. Free API host — Render

1. Push this whole project to a **GitHub repo**:
   ```bash
   cd /Users/macsho.com/Desktop/Spotify
   git init && git add . && git commit -m "Spotify clone"
   # create a repo on github.com, then:
   git remote add origin https://github.com/<you>/spotify-clone.git
   git push -u origin main
   ```
2. Go to <https://render.com> → **New → Blueprint** → connect the repo.
   Render reads [`render.yaml`](render.yaml) and creates the `spotify-clone-api` service.
   *(Or do it manually: New → Web Service → Root Directory `backend`,
   Build `npm install`, Start `npm start`, Plan **Free**.)*
3. In the service's **Environment**, set:
   - `MONGODB_URI` = your Atlas string from step A
   - `MONGODB_DB` = `spotifyclone`
4. Deploy. You'll get a public URL like `https://spotify-clone-api.onrender.com`.
5. Verify in a browser: `https://spotify-clone-api.onrender.com/api/home` → JSON.

> ⚠️ Render's free tier **sleeps after ~15 min idle**; the first request then takes
> ~50s to wake. Fine for a demo. The app shows a "Could not reach the API" message
> during a cold start — just pull-to-refresh once it wakes.

---

## C. Build the Android APK — Expo EAS (free)

1. Install the CLI and sign in (creates a free Expo account if needed):
   ```bash
   cd /Users/macsho.com/Desktop/Spotify/mobile
   npm install -g eas-cli      # or use: npx eas-cli@latest <cmd>
   eas login
   ```
2. Link the project to your account (writes `extra.eas.projectId` into `app.json`):
   ```bash
   eas init
   ```
3. Put your Render URL into [`mobile/eas.json`](mobile/eas.json) — replace
   `https://REPLACE-WITH-YOUR-BACKEND.onrender.com` in the **preview** profile's
   `EXPO_PUBLIC_API_URL`. This bakes the API URL into the APK.
4. Build the APK in Expo's cloud (free Android queue):
   ```bash
   eas build -p android --profile preview
   ```
5. When it finishes (a few minutes), EAS prints a **download link** for
   `app-release.apk`. Open it on your Android phone, allow "install from unknown
   sources", and install. The app now talks to your live backend from anywhere.

---

## D. (Optional) Host the admin panel free

Static site — deploy to **Netlify** or **Cloudflare Pages**:
- Base/Root directory: `admin`
- Build command: `npm run build`  ·  Publish directory: `admin/dist`
- Environment variable: `VITE_API_URL` = your Render URL

[`admin/netlify.toml`](admin/netlify.toml) already sets the build + SPA redirect.

---

## Appendix — try it remotely in 5 min with NO deploy (tunnels)

Useful for a quick demo without any accounts (your Mac must stay on):

```bash
# 1. expose the local backend to the internet (no account needed)
brew install cloudflared            # if not installed
cloudflared tunnel --url http://localhost:4000
#   → prints https://something.trycloudflare.com

# 2. point the app at it and run Expo so any phone can load it
cd mobile
EXPO_PUBLIC_API_URL="https://something.trycloudflare.com" \
  XDG_STATE_HOME="$HOME/.cache/xdg-state" npx expo start --tunnel
#   → scan the QR with Expo Go on any phone, anywhere
```

---

## Free-tier limits to know
| Service | Free limit | Impact |
|---|---|---|
| MongoDB Atlas M0 | 512 MB storage | plenty for songs metadata |
| Render free web | sleeps after 15 min idle, 750 hrs/mo | cold starts; fine for demo |
| Expo EAS | limited concurrent builds, Android APK free | iOS install needs paid Apple acct |
