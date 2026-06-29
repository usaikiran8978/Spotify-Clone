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

// The API caps each page at 40 results, so fetch several pages in parallel to
// surface many more songs (a popular query has hundreds).
const PAGES = 4;

async function fetchPage(query, page) {
  try {
    const res = await fetch(
      `${SAAVN_URL}/api/search/songs?query=${encodeURIComponent(query)}&page=${page}&limit=40`,
    );
    const json = await res.json();
    return json?.data?.results || json?.data || [];
  } catch {
    return [];
  }
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

export async function getArtistSongs(artistId, pages = 3) {
  if (!SAAVN_URL) return [];
  const reqs = Array.from({ length: pages }, (_, p) =>
    fetch(`${SAAVN_URL}/api/artists/${artistId}/songs?page=${p}`)
      .then((r) => r.json())
      .then((j) => j?.data?.songs || j?.data?.results || [])
      .catch(() => []),
  );
  const all = (await Promise.all(reqs)).flat();
  return dedupe(all.map(mapSong).filter((s) => s.audioUrl && s.title));
}

export async function searchSaavn(query) {
  if (!SAAVN_URL) return [];
  const pages = await Promise.all(
    Array.from({ length: PAGES }, (_, p) => fetchPage(query, p)),
  );
  // JioSaavn floods results with the same recording under many titles
  // (different albums / language tags / singer orderings) — dedupe collapses
  // them by normalised title + duration; genuinely different versions survive.
  return dedupe(pages.flat().map(mapSong).filter((s) => s.audioUrl && s.title));
}
