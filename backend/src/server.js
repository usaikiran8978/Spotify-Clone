import express from 'express';
import cors from 'cors';
import { customAlphabet } from 'nanoid';
import { store } from './store.js';
import { importCatalogue, importFromAudius } from './importer.js';
import { nameFor, categoryType } from './categories.js';

// Categories = the seed reference list + any new slug that appears on songs
// (e.g. a genre discovered during import). New types become categories
// automatically; existing ones are reused.
async function computeCategories() {
  const songs = await store.allSongs();
  const base = store.categories;
  const baseSlugs = new Set(base.map((c) => c.slug));
  const extra = new Map();
  for (const s of songs) {
    for (const slug of s.categories || []) {
      if (!slug || baseSlugs.has(slug) || extra.has(slug)) continue;
      extra.set(slug, { slug, name: nameFor(slug), type: categoryType(slug) });
    }
  }
  return [...base, ...extra.values()];
}

const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 10);
const app = express();
app.use(cors());
app.use(express.json());

const ok = (res, data) => res.json({ ok: true, data });
// Wrap async handlers so rejections become 500s instead of hanging.
const h = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((e) => {
    console.error(e);
    res.status(500).json({ ok: false, error: 'Server error' });
  });

// --- Reference data ----------------------------------------------------
app.get('/api/languages', (_req, res) => ok(res, store.languages));
app.get(
  '/api/categories',
  h(async (_req, res) => ok(res, await computeCategories())),
);

// --- Songs -------------------------------------------------------------
// Query params: language, category, q (search), sort=latest|popular, limit
app.get(
  '/api/songs',
  h(async (req, res) => {
    const { language, category, q, sort = 'latest', limit } = req.query;
    let list = await store.allSongs();

    if (language) list = list.filter((s) => s.language === language);
    if (category) list = list.filter((s) => s.categories?.includes(category));
    if (q) {
      const needle = String(q).toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(needle) ||
          s.artist.toLowerCase().includes(needle),
      );
    }

    if (sort === 'popular') list.sort((a, b) => (b.plays || 0) - (a.plays || 0));
    else list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (limit) list = list.slice(0, Number(limit));
    ok(res, list);
  }),
);

// "Latest songs", optionally filtered by language preference.
app.get(
  '/api/songs/latest',
  h(async (req, res) => {
    const { language, limit = 20 } = req.query;
    let list = (await store.allSongs()).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
    if (language) list = list.filter((s) => s.language === language);
    ok(res, list.slice(0, Number(limit)));
  }),
);

// Home feed for mobile: songs grouped into shelves by category.
app.get(
  '/api/home',
  h(async (req, res) => {
    const { language } = req.query;
    const all = await store.allSongs();
    const pool = language ? all.filter((s) => s.language === language) : all;

    const latest = [...all]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .filter((s) => !language || s.language === language)
      .slice(0, 12);

    const categories = await computeCategories();
    const shelves = categories
      .map((c) => ({
        slug: c.slug,
        name: c.name,
        type: c.type,
        songs: pool.filter((s) => s.categories?.includes(c.slug)).slice(0, 12),
      }))
      .filter((shelf) => shelf.songs.length > 0);

    ok(res, { latest, shelves });
  }),
);

app.get(
  '/api/songs/:id',
  h(async (req, res) => {
    const found = (await store.allSongs()).find((s) => s.id === req.params.id);
    if (!found) return res.status(404).json({ ok: false, error: 'Not found' });
    ok(res, found);
  }),
);

// --- Admin write endpoints --------------------------------------------
app.post(
  '/api/songs',
  h(async (req, res) => {
    const b = req.body || {};
    if (!b.title || !b.artist) {
      return res.status(400).json({ ok: false, error: 'title and artist are required' });
    }
    const song = {
      id: nanoid(),
      title: b.title,
      artist: b.artist,
      album: b.album || `${b.artist} • Single`,
      language: b.language || 'telugu',
      categories: Array.isArray(b.categories) ? b.categories : [],
      year: Number(b.year) || new Date().getFullYear(),
      duration: Number(b.duration) || 200,
      audioUrl: b.audioUrl || '',
      coverUrl: b.coverUrl || `https://picsum.photos/seed/${nanoid()}/400/400`,
      plays: 0,
      createdAt: new Date().toISOString(),
    };
    ok(res, await store.addSong(song));
  }),
);

app.put(
  '/api/songs/:id',
  h(async (req, res) => {
    const updated = await store.updateSong(req.params.id, req.body || {});
    if (!updated) return res.status(404).json({ ok: false, error: 'Not found' });
    ok(res, updated);
  }),
);

app.delete(
  '/api/songs/:id',
  h(async (req, res) => {
    const removed = await store.removeSong(req.params.id);
    if (!removed) return res.status(404).json({ ok: false, error: 'Not found' });
    ok(res, { id: req.params.id });
  }),
);

// Bulk-delete selected songs. Body: { ids: [...] }
app.post(
  '/api/admin/delete',
  h(async (req, res) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!ids.length) {
      return res.status(400).json({ ok: false, error: 'ids array is required' });
    }
    ok(res, { deleted: await store.removeSongs(ids) });
  }),
);

// Delete the entire catalogue.
app.post(
  '/api/admin/clear',
  h(async (_req, res) => ok(res, { deleted: await store.clearSongs() })),
);

app.post(
  '/api/admin/reseed',
  h(async (_req, res) => ok(res, { count: await store.reseed() })),
);

// Import a real song catalogue. Two sources:
//   ?source=itunes (default) — mainstream songs + art, 30s preview audio.
//   ?source=audius           — full-length streamable songs (indie catalogue).
app.post(
  '/api/admin/import',
  h(async (req, res) => {
    const source = req.query.source === 'audius' ? 'audius' : 'itunes';
    const songs =
      source === 'audius'
        ? await importFromAudius({ perQuery: req.query.perTerm })
        : await importCatalogue({ perTerm: req.query.perTerm });
    const result = await store.addSongs(songs);
    ok(res, { source, fetched: songs.length, ...result });
  }),
);

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
store.init().then(() => {
  app.listen(PORT, () => {
    console.log(`🎵  Song API running on http://localhost:${PORT}`);
  });
});
