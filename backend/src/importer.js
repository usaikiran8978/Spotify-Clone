// Imports a broad, real song catalogue from two free, keyless sources:
//   - iTunes Search API  → mainstream songs + art + 30s preview audio
//   - Audius API         → full-length streamable songs (indie/electronic)
//
// Categories are derived from each song's actual genre/type (not forced into a
// fixed list). Any new genre becomes a new category automatically — see
// categories.js + the server's computeCategories().
import { customAlphabet } from 'nanoid';
import { genreToSlug, isNonMusicGenre } from './categories.js';

const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Decade slugs aligned with the seed reference categories (90s, 2000s, …).
const decadeCats = (year) => {
  if (!year) return [];
  if (year >= 1980 && year < 1990) return ['80s'];
  if (year >= 1990 && year < 2000) return ['90s'];
  if (year >= 2000 && year < 2010) return ['2000s'];
  if (year >= 2010 && year < 2020) return ['2010s'];
  if (year >= 2020 && year < 2030) return ['2020s'];
  return [];
};

// Build a song's category list from language + query mood tags + real genre +
// decade. De-duplicated, empties stripped.
const buildCats = ({ language, moodCats = [], genre, year }) => {
  const genreSlug = genreToSlug(genre);
  return [
    ...new Set(
      [language, ...moodCats, genreSlug, ...decadeCats(year)].filter(Boolean),
    ),
  ];
};

const key = (title, artist) => `${title}|${artist}`.trim().toLowerCase();

// ---------------------------------------------------------------- iTunes -----
// Mood tags are applied as-is; the song's real genre is added on top.
const ITUNES_QUERIES = [
  // ---- Global genres / types (English, US store) ----
  { term: 'top hits', language: 'english', country: 'US', cats: [] },
  { term: 'pop hits', language: 'english', country: 'US', cats: [] },
  { term: 'hip hop rap', language: 'english', country: 'US', cats: [] },
  { term: 'rock classics', language: 'english', country: 'US', cats: [] },
  { term: 'edm dance party', language: 'english', country: 'US', cats: ['dj', 'party'] },
  { term: 'r&b soul', language: 'english', country: 'US', cats: [] },
  { term: 'country music', language: 'english', country: 'US', cats: [] },
  { term: 'jazz', language: 'english', country: 'US', cats: [] },
  { term: 'classical', language: 'english', country: 'US', cats: ['instrumental'] },
  { term: 'electronic', language: 'english', country: 'US', cats: ['dj'] },
  { term: 'metal', language: 'english', country: 'US', cats: [] },
  { term: 'reggae', language: 'english', country: 'US', cats: [] },
  { term: 'indie', language: 'english', country: 'US', cats: [] },
  { term: 'k-pop', language: 'english', country: 'US', cats: [] },
  { term: 'latin hits', language: 'english', country: 'US', cats: ['party'] },
  { term: 'workout motivation', language: 'english', country: 'US', cats: ['workout'] },
  { term: 'love songs', language: 'english', country: 'US', cats: ['love', 'romance'] },
  { term: 'sad songs', language: 'english', country: 'US', cats: ['sad'] },
  { term: 'party anthems', language: 'english', country: 'US', cats: ['party', 'dj'] },
  { term: 'kids songs', language: 'english', country: 'US', cats: ['kids', 'family'] },
  { term: 'family road trip songs', language: 'english', country: 'US', cats: ['family'] },
  { term: 'movie soundtrack', language: 'english', country: 'US', cats: ['movie'] },
  { term: 'friendship songs', language: 'english', country: 'US', cats: ['friendship'] },
  { term: '80s hits', language: 'english', country: 'US', cats: [] },
  { term: '90s hits', language: 'english', country: 'US', cats: [] },
  { term: '2000s hits', language: 'english', country: 'US', cats: [] },
  { term: '2010s hits', language: 'english', country: 'US', cats: [] },
  // ---- Telugu ----
  { term: 'telugu hit songs', language: 'telugu', country: 'IN', cats: ['telugu'] },
  { term: 'telugu movie songs', language: 'telugu', country: 'IN', cats: ['telugu', 'movie'] },
  { term: 'telugu love songs', language: 'telugu', country: 'IN', cats: ['telugu', 'love'] },
  { term: 'telugu dj remix', language: 'telugu', country: 'IN', cats: ['telugu', 'dj'] },
  { term: 'telugu devotional', language: 'telugu', country: 'IN', cats: ['telugu', 'devotional'] },
  { term: 'telugu folk songs', language: 'telugu', country: 'IN', cats: ['telugu', 'folk'] },
  { term: 'sankranthi telugu', language: 'telugu', country: 'IN', cats: ['telugu', 'sankranthi'] },
  { term: 'venkatesh hit songs', language: 'telugu', country: 'IN', cats: ['telugu', 'venkatesh'] },
  // ---- Hindi ----
  { term: 'hindi bollywood hits', language: 'hindi', country: 'IN', cats: ['hindi', 'movie'] },
  { term: 'hindi love songs', language: 'hindi', country: 'IN', cats: ['hindi', 'love'] },
  { term: 'hindi party dj', language: 'hindi', country: 'IN', cats: ['hindi', 'dj', 'party'] },
  { term: 'hindi devotional bhajan', language: 'hindi', country: 'IN', cats: ['hindi', 'devotional'] },
  { term: 'hindi workout', language: 'hindi', country: 'IN', cats: ['hindi', 'workout'] },
  // ---- Tamil ----
  { term: 'tamil hit songs', language: 'tamil', country: 'IN', cats: ['tamil'] },
  { term: 'tamil movie songs', language: 'tamil', country: 'IN', cats: ['tamil', 'movie'] },
  { term: 'tamil love songs', language: 'tamil', country: 'IN', cats: ['tamil', 'love'] },
  { term: 'ajith hit songs', language: 'tamil', country: 'IN', cats: ['tamil', 'ajith'] },
  { term: 'tamil dj remix', language: 'tamil', country: 'IN', cats: ['tamil', 'dj'] },
  // ---- Kannada ----
  { term: 'kannada hit songs', language: 'kannada', country: 'IN', cats: ['kannada'] },
  { term: 'kannada movie songs', language: 'kannada', country: 'IN', cats: ['kannada', 'movie'] },
  { term: 'kannada love songs', language: 'kannada', country: 'IN', cats: ['kannada', 'love'] },
];

const bigArt = (url) =>
  url ? url.replace(/\/\d+x\d+bb\.(jpg|png)/, '/600x600bb.$1') : url;

// iTunes throttles bursts (HTTP 429). Retry a couple of times with backoff.
async function searchItunes({ term, country, limit }) {
  const url =
    `https://itunes.apple.com/search?term=${encodeURIComponent(term)}` +
    `&media=music&entity=song&limit=${limit}&country=${country}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': 'spotify-clone-importer' } });
    if (res.ok) return (await res.json()).results || [];
    if (res.status === 429) {
      await sleep(1500 * (attempt + 1));
      continue;
    }
    throw new Error(`iTunes ${res.status}`);
  }
  throw new Error('iTunes 429 (rate limited)');
}

export async function importCatalogue({ perTerm = 50 } = {}) {
  const limit = Math.min(Math.max(Number(perTerm) || 50, 1), 200);
  const seen = new Set();
  const songs = [];

  for (const q of ITUNES_QUERIES) {
    await sleep(250); // be gentle with the iTunes API (avoids 429 bursts)
    let results;
    try {
      results = await searchItunes({ term: q.term, country: q.country, limit });
    } catch (e) {
      console.warn(`itunes "${q.term}" failed: ${e.message}`);
      continue;
    }
    for (const r of results) {
      if (!r.previewUrl || !r.trackName || !r.artistName) continue;
      if (isNonMusicGenre(r.primaryGenreName)) continue;
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
        categories: buildCats({
          language: q.language,
          moodCats: q.cats,
          genre: r.primaryGenreName,
          year,
        }),
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

// ---------------------------------------------------------------- Audius -----
const AUDIUS_GATEWAY = 'https://discoveryprovider.audius.co';
const APP = 'spotifyclone';

const AUDIUS_SEARCHES = [
  { q: 'telugu', language: 'telugu', cats: ['telugu'] },
  { q: 'tollywood', language: 'telugu', cats: ['telugu', 'movie'] },
  { q: 'hindi', language: 'hindi', cats: ['hindi'] },
  { q: 'bollywood', language: 'hindi', cats: ['hindi', 'movie'] },
  { q: 'tamil', language: 'tamil', cats: ['tamil'] },
  { q: 'kannada', language: 'kannada', cats: ['kannada'] },
  { q: 'love', language: 'english', cats: ['love', 'romance'] },
  { q: 'workout', language: 'english', cats: ['workout'] },
  { q: 'party', language: 'english', cats: ['party', 'dj'] },
  { q: 'family', language: 'english', cats: ['family'] },
  { q: 'kids', language: 'english', cats: ['kids', 'family'] },
  { q: 'movie', language: 'english', cats: ['movie'] },
  { q: 'remix', language: 'english', cats: ['dj'] },
  { q: 'sad', language: 'english', cats: ['sad'] },
  { q: 'instrumental', language: 'english', cats: ['instrumental'] },
];

const AUDIUS_TRENDING = [
  { genre: 'Electronic', language: 'english', cats: ['dj'] },
  { genre: 'Hip-Hop/Rap', language: 'english', cats: ['workout'] },
  { genre: 'Pop', language: 'english', cats: [] },
  { genre: 'R&B/Soul', language: 'english', cats: ['love'] },
  { genre: 'Rock', language: 'english', cats: [] },
  { genre: 'Dancehall', language: 'english', cats: ['party'] },
  { genre: 'Classical', language: 'english', cats: ['instrumental'] },
];

async function audiusGet(path) {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${AUDIUS_GATEWAY}${path}${sep}app_name=${APP}`, {
    headers: { 'User-Agent': 'spotify-clone-importer' },
  });
  if (!res.ok) throw new Error(`audius ${res.status}`);
  return (await res.json()).data || [];
}

function mapAudiusTrack(t, q, seen) {
  if (!t || !t.id || !t.title || !t.is_streamable) return null;
  if (isNonMusicGenre(t.genre)) return null;
  const artist = t.user?.name || 'Unknown Artist';
  const k = key(t.title, artist);
  if (seen.has(k)) return null;
  seen.add(k);

  const dateStr = t.release_date || t.created_at;
  const year = dateStr ? new Date(dateStr).getFullYear() : undefined;
  return {
    id: nanoid(),
    title: t.title,
    artist,
    album: t.album || `${artist} • Audius`,
    language: q.language,
    categories: buildCats({
      language: q.language,
      moodCats: q.cats,
      genre: t.genre,
      year,
    }),
    year: year || new Date().getFullYear(),
    duration: t.duration || 0,
    audioUrl: `${AUDIUS_GATEWAY}/v1/tracks/${t.id}/stream?app_name=${APP}`,
    coverUrl:
      t.artwork?.['1000x1000'] || t.artwork?.['480x480'] || t.artwork?.['150x150'] || '',
    plays: t.play_count || 0,
    createdAt: new Date().toISOString(),
  };
}

export async function importFromAudius({ perQuery = 30, pages = 2 } = {}) {
  const limit = Math.min(Math.max(Number(perQuery) || 30, 1), 100);
  const pageCount = Math.min(Math.max(Number(pages) || 2, 1), 5);
  const seen = new Set();
  const songs = [];

  // Paginated text searches — pull several pages so re-imports go deeper.
  for (const q of AUDIUS_SEARCHES) {
    for (let p = 0; p < pageCount; p++) {
      let results;
      try {
        results = await audiusGet(
          `/v1/tracks/search?query=${encodeURIComponent(q.q)}&limit=${limit}&offset=${p * limit}`,
        );
      } catch (e) {
        console.warn(`audius search "${q.q}" p${p} failed: ${e.message}`);
        break;
      }
      if (!results.length) break;
      for (const t of results) {
        const song = mapAudiusTrack(t, q, seen);
        if (song) songs.push(song);
      }
    }
  }

  // Trending by genre — bulk full-length tracks.
  for (const g of AUDIUS_TRENDING) {
    let results;
    try {
      results = await audiusGet(`/v1/tracks/trending?genre=${encodeURIComponent(g.genre)}`);
    } catch (e) {
      console.warn(`audius trending "${g.genre}" failed: ${e.message}`);
      continue;
    }
    for (const t of results) {
      const song = mapAudiusTrack(t, g, seen);
      if (song) songs.push(song);
    }
  }
  return songs;
}
