// Shared category helpers. Categories are no longer a fixed list — they are
// derived from each song's genre/type at import time, and any new slug that
// appears in the catalogue automatically becomes a category (see server's
// computeCategories). This module maps raw genre strings → stable slugs and
// gives each slug a human display name + type.

export const slugify = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents: Música → Musica
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '') // drop apostrophes: Children's → Childrens
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Pretty names for slugs we generate (fallback: title-cased slug).
const CATEGORY_NAMES = {
  'hip-hop-rap': 'Hip-Hop / Rap',
  'rnb-soul': 'R&B / Soul',
  'dance-edm': 'Dance / EDM',
  movie: 'Movie / Soundtrack',
  dj: 'DJ / Remix',
  family: 'Family',
  kids: 'Kids',
  devotional: 'Devotional / Bhakti',
  party: 'Party',
  romance: 'Romance',
  love: 'Love / Melody',
  sad: 'Sad / Emotional',
  instrumental: 'Instrumental',
  workout: 'Workout',
  friendship: 'Friendship',
  folk: 'Folk',
  classical: 'Classical',
  rock: 'Rock',
  pop: 'Pop',
  country: 'Country',
  electronic: 'Electronic',
  jazz: 'Jazz',
  metal: 'Metal',
  blues: 'Blues',
  reggae: 'Reggae',
  alternative: 'Alternative',
  indie: 'Indie',
  latin: 'Latin',
  'k-pop': 'K-Pop',
  'singer-songwriter': 'Singer / Songwriter',
  world: 'World',
  '80s': "80's",
  '2010s': "2010's",
  '2020s': "2020's",
};

const DECADE_RE = /^(19|20)\d0s$/;
const NON_MUSIC_RE = /audiobook|podcast|^books$/i;

// Slugs that describe a song's "type/mood" rather than a music genre.
const MOOD_SLUGS = new Set([
  'movie', 'dj', 'family', 'kids', 'devotional', 'party', 'romance',
  'love', 'sad', 'instrumental', 'workout', 'friendship',
]);

export const nameFor = (slug) =>
  CATEGORY_NAMES[slug] ||
  String(slug)
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');

export const categoryType = (slug) =>
  DECADE_RE.test(slug) ? 'decade' : MOOD_SLUGS.has(slug) ? 'mood' : 'genre';

// Genres that aren't really music — skip these tracks during import.
export const isNonMusicGenre = (genre) => NON_MUSIC_RE.test(String(genre || ''));

// Map a raw genre string (iTunes primaryGenreName / Audius genre) → a slug.
export const genreToSlug = (genre) => {
  const g = String(genre || '').toLowerCase();
  if (!g) return null;
  if (g.includes('hip') || g.includes('rap')) return 'hip-hop-rap';
  if (g.includes('r&b') || g.includes('soul')) return 'rnb-soul';
  if (
    g.includes('dance') || g.includes('edm') || g.includes('house') ||
    g.includes('techno') || g.includes('electro') || g.includes('dubstep') ||
    g.includes('trance')
  )
    return 'dance-edm';
  if (g.includes('soundtrack') || g.includes('film') || g.includes('movie'))
    return 'movie';
  if (g.includes('singer')) return 'singer-songwriter';
  if (g.includes('k-pop') || g.includes('kpop')) return 'k-pop';
  if (g.includes('worldwide') || g.includes('world')) return 'world';
  if (g.includes('classical')) return 'classical';
  if (g.includes('metal')) return 'metal';
  if (g.includes('country')) return 'country';
  if (g.includes('reggae')) return 'reggae';
  if (g.includes('latin')) return 'latin';
  if (g.includes('alternative')) return 'alternative';
  if (g.includes('indie')) return 'indie';
  return slugify(genre);
};
