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

export async function searchSaavn(query) {
  if (!SAAVN_URL) return [];
  const res = await fetch(
    `${SAAVN_URL}/api/search/songs?query=${encodeURIComponent(query)}&page=0&limit=40`,
  );
  const json = await res.json();
  const results = json?.data?.results || json?.data || [];
  return results
    .map(mapSong)
    .filter((s) => s.audioUrl && s.title);
}
