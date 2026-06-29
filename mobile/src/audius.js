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

async function get(path) {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${HOST}/v1${path}${sep}app_name=${APP}`);
  const json = await res.json();
  return json.data || [];
}

const toSongs = (tracks) =>
  (tracks || [])
    .filter((t) => t && t.id && t.title && t.is_streamable !== false)
    .map((t) => mapTrack(t, HOST));

// --- Songs ---
export async function searchAudius(query) {
  return toSongs(await get(`/tracks/search?query=${encodeURIComponent(query)}&limit=30`));
}

// --- Artists ---
export async function searchAudiusArtists(query) {
  const users = await get(`/users/search?query=${encodeURIComponent(query)}`);
  return (users || [])
    .filter((u) => u && u.id && u.name)
    .map((u) => ({
      id: String(u.id),
      name: u.name,
      handle: u.handle,
      followers: u.follower_count || 0,
      picture:
        u.profile_picture?.['480x480'] ||
        u.profile_picture?.['150x150'] ||
        '',
    }));
}

export async function getArtistSongs(userId) {
  return toSongs(await get(`/users/${userId}/tracks?limit=40`));
}

// --- Albums / collections (Audius albums are playlists) ---
export async function searchAudiusAlbums(query) {
  const pls = await get(`/playlists/search?query=${encodeURIComponent(query)}`);
  return (pls || [])
    .filter((p) => p && p.id && p.playlist_name)
    .map((p) => ({
      id: String(p.id),
      name: p.playlist_name,
      isAlbum: !!p.is_album,
      owner: p.user?.name || '',
      art:
        p.artwork?.['480x480'] ||
        p.artwork?.['1000x1000'] ||
        p.artwork?.['150x150'] ||
        '',
    }));
}

export async function getAlbumSongs(playlistId) {
  return toSongs(await get(`/playlists/${playlistId}/tracks`));
}
