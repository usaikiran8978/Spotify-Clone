// Live Audius search for the mobile Search screen. Uses Audius's public
// keyless API (the `app_name` query param) — same method the backend importer
// uses, so no API key is required. We hit the stable discovery host directly
// (it serves both /search and /stream; the api.audius.co gateway does not
// reliably proxy streams).
//
// Results are mapped into the app's standard song shape, so the existing
// SongRow / player / download / add-to-playlist features work unchanged.
const HOST = 'https://discoveryprovider.audius.co';
const APP = 'melody';

function mapTrack(t, host) {
  const artist = t.user?.name || 'Unknown Artist';
  return {
    id: String(t.id),
    title: t.title,
    artist,
    album: t.album || `${artist} • Audius`,
    language: 'english',
    categories: t.genre ? [String(t.genre).toLowerCase()] : [],
    year: t.release_date ? new Date(t.release_date).getFullYear() : undefined,
    duration: t.duration || 0, // full-length seconds
    audioUrl: `${host}/v1/tracks/${t.id}/stream?app_name=${APP}`,
    coverUrl:
      t.artwork?.['480x480'] || t.artwork?.['1000x1000'] || t.artwork?.['150x150'] || '',
    plays: t.play_count || 0,
  };
}

export async function searchAudius(query) {
  const res = await fetch(
    `${HOST}/v1/tracks/search?query=${encodeURIComponent(query)}&limit=30&app_name=${APP}`,
  );
  const json = await res.json();
  return (json.data || [])
    .filter((t) => t && t.id && t.title && t.is_streamable !== false)
    .map((t) => mapTrack(t, HOST));
}
