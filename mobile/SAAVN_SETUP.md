# Full-length songs via a self-hosted JioSaavn API

The mobile Search uses **full-length songs** when a JioSaavn API instance is
configured, and falls back to iTunes 30-second previews otherwise.

> ⚠️ The JioSaavn API is **unofficial** (it surfaces JioSaavn's own stream
> URLs). It's fine for personal / learning use. Don't ship it commercially.

## 1. Deploy the API

Open-source project: **sumitkolhe/jiosaavn-api** (https://github.com/sumitkolhe/jiosaavn-api)

**Option A — Vercel (fastest):** click "Deploy" in that repo's README → you get
a URL like `https://your-app.vercel.app`.

**Option B — Render (you already use Render):**
1. New → Web Service → connect a fork of `sumitkolhe/jiosaavn-api`
2. Runtime: Node · Build: `npm install && npm run build` · Start: `npm run start:prod`
3. Deploy → you get `https://your-saavn-api.onrender.com`

Verify it works:
```
https://YOUR-INSTANCE/api/search/songs?query=Samajavaragamana
```
You should see JSON with `data.results[].downloadUrl` (320kbps full-song URLs).

## 2. Point the app at it

Set the env var to your instance URL (no trailing slash):

- **EAS builds:** put it in `eas.json` → `build.<profile>.env.EXPO_PUBLIC_SAAVN_URL`
- **Local dev:** add to `mobile/.env`:
  ```
  EXPO_PUBLIC_SAAVN_URL=https://your-saavn-api.onrender.com
  ```

Rebuild / restart. Search now returns full-length Telugu / Hindi / Tamil songs.
Leaving it empty keeps the legal iTunes-preview behaviour.
