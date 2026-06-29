// Full-length song search via a self-hosted JioSaavn API
// (open-source sumitkolhe/jiosaavn-api). Set EXPO_PUBLIC_SAAVN_URL to your
// deployed instance — see mobile/.env.example. Returns FULL songs (320kbps),
// mapped to the app's song shape so play/download/playlist work unchanged.
import { SAAVN_URL } from './config';

export const saavnEnabled = () => !!SAAVN_URL;

// JioSaavn names/albums come HTML-encoded (&amp;, &#039;, &quot;).
const decode = (s) =>
  String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

const pickLast = (arr) => (Array.isArray(arr) && arr.length ? arr[arr.length - 1] : null);

// Normalise a title for de-duping. JioSaavn returns the same recording under
// many titles — "(From "Movie")", "- Telugu/Hindi/…" language tags, "(107 BPM)",
// "feat …" — so strip all that. Paired with duration, identical recordings
// collapse while genuinely different versions (different length) survive.
const normTitle = (t) =>
  String(t || '')
    .toLowerCase()
    .replace(/&quot;|&amp;|&#0?39;/g, ' ')
    .replace(/\((from|feat|with)[^)]*\)/gi, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\(\d+\s*bpm\)/gi, '')
    .replace(/\b(telugu|hindi|tamil|kannada|malayalam)\b/gi, '')
    .replace(/[-–—]\s*(from|feat|lyrical|lo-?fi|slowed|reverb).*$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

function mapSong(s) {
  const audio = pickLast(s.downloadUrl || s.download_url);
  const img = pickLast(s.image);
  const artist =
    s.artists?.primary?.map((a) => a.name).join(', ') ||
    s.primaryArtists ||
    s.subtitle ||
    'Unknown Artist';
  return {
    id: `js_${s.id}`,
    title: decode(s.name || s.title),
    artist: decode(artist),
    album: decode(s.album?.name || ''),
    language: s.language || '',
    categories: [],
    year: s.year ? Number(s.year) : undefined,
    duration: Number(s.duration) || 0, // FULL-length seconds
    audioUrl: audio?.url || audio?.link || '',
    coverUrl: img?.url || img?.link || '',
    plays: Number(s.playCount) || 0,
  };
}


// Load (almost) all pages for a paginated endpoint. Reads `total` from the
// first page, then fetches the rest in concurrency-limited batches so the free
// API instance isn't overwhelmed. `maxPages` caps very large catalogues.
async function loadAllPages(buildUrl, listKey, maxPages, concurrency = 8) {
  const readList = (j) => {
    const d = j?.data || {};
    return d[listKey] || d.results || [];
  };
  let first;
  try {
    first = await fetch(buildUrl(0)).then((r) => r.json());
  } catch {
    return [];
  }
  const list0 = readList(first);
  const total = first?.data?.total || list0.length;
  const pageSize = list0.length || 1;
  const pageCount = Math.min(Math.ceil(total / pageSize), maxPages);
  const out = [...list0];

  for (let i = 1; i < pageCount; i += concurrency) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(concurrency, pageCount - i) }, (_, k) =>
        fetch(buildUrl(i + k))
          .then((r) => r.json())
          .then(readList)
          .catch(() => []),
      ),
    );
    for (const b of batch) out.push(...b);
  }
  return out;
}

// De-dupe a list of mapped songs by normalised title + duration.
function dedupe(mapped) {
  const seen = new Set();
  const out = [];
  for (const s of mapped) {
    const key = `${normTitle(s.title)}|${s.duration}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

// --- Artists ---
export async function searchSaavnArtists(query) {
  if (!SAAVN_URL) return [];
  try {
    const res = await fetch(
      `${SAAVN_URL}/api/search/artists?query=${encodeURIComponent(query)}`,
    );
    const json = await res.json();
    const arts = json?.data?.results || json?.data || [];
    return arts
      .filter((a) => a && a.id && a.name)
      .map((a) => ({
        id: String(a.id),
        name: decode(a.name),
        image: pickLast(a.image)?.url || pickLast(a.image)?.link || '',
        role: a.role || '',
      }));
  } catch {
    return [];
  }
}

export async function getArtistSongs(artistId) {
  if (!SAAVN_URL) return [];
  // Artist endpoint serves 10/page; load up to ~600 songs.
  const all = await loadAllPages(
    (p) => `${SAAVN_URL}/api/artists/${artistId}/songs?page=${p}`,
    'songs',
    60,
  );
  return dedupe(all.map(mapSong).filter((s) => s.audioUrl && s.title));
}

export async function searchSaavn(query) {
  if (!SAAVN_URL) return [];
  // Load all result pages (40/page) up to a generous cap.
  const all = await loadAllPages(
    (p) =>
      `${SAAVN_URL}/api/search/songs?query=${encodeURIComponent(query)}&page=${p}&limit=40`,
    'results',
    20,
  );
  // JioSaavn floods results with the same recording under many titles
  // (different albums / language tags / singer orderings) — dedupe collapses
  // them by normalised title + duration; genuinely different versions survive.
  return dedupe(all.map(mapSong).filter((s) => s.audioUrl && s.title));
}
