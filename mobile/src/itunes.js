// Live iTunes (Apple Music) search for the mobile Search screen. Free, keyless,
// and has a large real catalogue including Telugu / Hindi / Tamil film songs
// with playable 30-second previews + artwork. Biased to the India store so
// regional songs rank well.
//
// Results map to the app's standard song shape, so play / download /
// add-to-playlist all work unchanged.
const COUNTRY = 'IN';

const bigArt = (url) =>
  url ? url.replace(/\/\d+x\d+bb\.(jpg|png)/, '/300x300bb.$1') : url;

function mapTrack(r) {
  const year = r.releaseDate ? new Date(r.releaseDate).getFullYear() : undefined;
  return {
    id: `it_${r.trackId}`,
    title: r.trackName,
    artist: r.artistName,
    album: r.collectionName || `${r.artistName} • Single`,
    language: (r.primaryGenreName || '').toLowerCase(),
    categories: [],
    year,
    duration: r.trackTimeMillis ? Math.round(r.trackTimeMillis / 1000) : 30,
    audioUrl: r.previewUrl,
    coverUrl: bigArt(r.artworkUrl100) || r.artworkUrl60 || '',
    plays: 0,
  };
}

export async function searchItunes(query) {
  const res = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}` +
      `&media=music&entity=song&limit=40&country=${COUNTRY}`,
  );
  const json = await res.json();
  return (json.results || [])
    .filter((r) => r.previewUrl && r.trackName && r.artistName)
    .map(mapTrack);
}
