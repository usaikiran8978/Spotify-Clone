// Imports a real song catalogue from the iTunes Search API.
//
// iTunes Search is free, needs no API key, is global, and returns real song
// metadata + album art + a playable 30-second preview (the only audio any
// major service legally exposes — full tracks / Spotify's catalogue are not
// downloadable). We map each result into the app's song schema and tag it
// with language / category / decade so the home shelves populate.
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 10);

// Each query pulls one "shelf" worth of songs. `cats` are always applied;
// the song's language drives the language filter; decade is derived from year.
const QUERIES = [
  // ---- Telugu ----
  { term: 'telugu hit songs', language: 'telugu', country: 'IN', cats: ['telugu'] },
  { term: 'telugu love melodies', language: 'telugu', country: 'IN', cats: ['telugu', 'love'] },
  { term: 'telugu dj remix', language: 'telugu', country: 'IN', cats: ['telugu', 'dj'] },
  { term: 'telugu mass beats', language: 'telugu', country: 'IN', cats: ['telugu', 'workout'] },
  { term: 'sankranthi telugu songs', language: 'telugu', country: 'IN', cats: ['telugu', 'sankranthi'] },
  { term: 'venkatesh hit songs', language: 'telugu', country: 'IN', cats: ['telugu', 'venkatesh'] },
  { term: 'telugu friendship songs', language: 'telugu', country: 'IN', cats: ['telugu', 'friendship'] },
  // ---- Tamil ----
  { term: 'tamil hit songs', language: 'tamil', country: 'IN', cats: ['tamil'] },
  { term: 'tamil love songs', language: 'tamil', country: 'IN', cats: ['tamil', 'love'] },
  { term: 'ajith hit songs', language: 'tamil', country: 'IN', cats: ['tamil', 'ajith'] },
  { term: 'tamil dj remix', language: 'tamil', country: 'IN', cats: ['tamil', 'dj'] },
  // ---- Hindi ----
  { term: 'hindi bollywood hits', language: 'hindi', country: 'IN', cats: ['hindi'] },
  { term: 'hindi love songs', language: 'hindi', country: 'IN', cats: ['hindi', 'love'] },
  { term: 'bollywood workout songs', language: 'hindi', country: 'IN', cats: ['hindi', 'workout'] },
  { term: 'hindi party dj', language: 'hindi', country: 'IN', cats: ['hindi', 'dj'] },
  // ---- Kannada ----
  { term: 'kannada hit songs', language: 'kannada', country: 'IN', cats: ['kannada'] },
  { term: 'kannada love songs', language: 'kannada', country: 'IN', cats: ['kannada', 'love'] },
  // ---- English ----
  { term: 'top pop hits', language: 'english', country: 'US', cats: ['english'] },
  { term: 'english love songs', language: 'english', country: 'US', cats: ['english', 'love'] },
  { term: 'workout gym songs', language: 'english', country: 'US', cats: ['english', 'workout'] },
  { term: 'friendship anthems', language: 'english', country: 'US', cats: ['english', 'friendship'] },
];

const decadeCats = (year) => {
  if (!year) return [];
  if (year >= 1990 && year < 2000) return ['90s'];
  if (year >= 2000 && year < 2010) return ['2000s'];
  return [];
};

// iTunes artwork URLs end in `/100x100bb.jpg` — swap for a larger render.
const bigArt = (url) =>
  url ? url.replace(/\/\d+x\d+bb\.(jpg|png)/, '/600x600bb.$1') : url;

const key = (title, artist) => `${title}|${artist}`.trim().toLowerCase();

async function searchItunes({ term, country, limit }) {
  const url =
    `https://itunes.apple.com/search?term=${encodeURIComponent(term)}` +
    `&media=music&entity=song&limit=${limit}&country=${country}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'spotify-clone-importer' } });
  if (!res.ok) throw new Error(`iTunes ${res.status}`);
  const json = await res.json();
  return json.results || [];
}

// Fetch + map + de-duplicate across all queries. Returns ready-to-store songs.
// `perTerm` (1–200) controls how many results each query pulls.
export async function importCatalogue({ perTerm = 50 } = {}) {
  const limit = Math.min(Math.max(Number(perTerm) || 50, 1), 200);
  const seen = new Set();
  const songs = [];

  for (const q of QUERIES) {
    let results;
    try {
      results = await searchItunes({ term: q.term, country: q.country, limit });
    } catch (e) {
      console.warn(`import: query "${q.term}" failed: ${e.message}`);
      continue;
    }
    for (const r of results) {
      if (!r.previewUrl || !r.trackName || !r.artistName) continue;
      const k = key(r.trackName, r.artistName);
      if (seen.has(k)) continue;
      seen.add(k);

      const year = r.releaseDate ? new Date(r.releaseDate).getFullYear() : undefined;
      songs.push({
        id: nanoid(),
        title: r.trackName,
        artist: r.artistName,
        album: r.collectionName || `${r.artistName} • Single`,
        language: q.language,
        categories: [...new Set([...q.cats, ...decadeCats(year)])],
        year: year || new Date().getFullYear(),
        duration: r.trackTimeMillis ? Math.round(r.trackTimeMillis / 1000) : 30,
        audioUrl: r.previewUrl,
        coverUrl: bigArt(r.artworkUrl100) || r.artworkUrl60 || '',
        plays: 0,
        createdAt: new Date().toISOString(),
      });
    }
  }
  return songs;
}
