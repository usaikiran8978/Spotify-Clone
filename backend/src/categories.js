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

// Namespaced prefixes for the high-cardinality facets so they never collide
// with genre/mood slugs (e.g. an artist literally named "Pop").
export const SINGER_PREFIX = 'singer-';
export const MOVIE_PREFIX = 'movie-';

// Slugs that describe a song's "type/mood" rather than a music genre.
const MOOD_SLUGS = new Set([
  'movie', 'dj', 'family', 'kids', 'devotional', 'party', 'romance',
  'love', 'sad', 'instrumental', 'workout', 'friendship',
]);

// Festivals detected from a song's title/album text. Order matters only for
// display; a song can match several. `re` is tested against title + album +
// any query context, so festival songs are tagged from their ORIGINAL text
// regardless of which search bucket surfaced them.
const FESTIVALS = [
  { slug: 'sankranthi', name: 'Sankranthi Special', re: /sankranth|pongal|makar\s?sankranti|bhogi/i },
  { slug: 'diwali', name: 'Diwali Special', re: /diwali|deepavali|deepawali/i },
  { slug: 'christmas', name: 'Christmas Special', re: /christmas|xmas|jingle bell|santa|silent night|noel/i },
  { slug: 'holi', name: 'Holi Special', re: /\bholi\b|rang barse|holi hai/i },
  { slug: 'eid', name: 'Eid / Ramzan Special', re: /\beid\b|ramzan|ramadan|bakrid/i },
  { slug: 'navratri', name: 'Navratri / Dussehra', re: /navratri|navaratri|dussehra|dasara|durga puja|garba|dandiya/i },
  { slug: 'ganesh-chaturthi', name: 'Ganesh Chaturthi', re: /ganesh|vinayaka|ganapati|ganpati/i },
  { slug: 'ugadi', name: 'Ugadi / New Year', re: /ugadi|gudi padwa|vishu|baisakhi|puthandu/i },
  { slug: 'new-year', name: 'New Year Special', re: /new year|happy new year|countdown/i },
  { slug: 'valentine', name: "Valentine's Special", re: /valentine/i },
];
const FESTIVAL_SLUGS = new Set(FESTIVALS.map((f) => f.slug));
const FESTIVAL_NAMES = Object.fromEntries(FESTIVALS.map((f) => [f.slug, f.name]));

// Return every festival slug whose pattern appears in the given text.
export const festivalSlugs = (text) =>
  FESTIVALS.filter((f) => f.re.test(String(text || ''))).map((f) => f.slug);

// Albums that are NOT real movies/films — generic collections, singles,
// compilations ("Telugu Love Songs", "Yesudas Hits", "Top 50", …).
const NON_MOVIE_RE =
  /\b(songs?|single|singles|ep|hits?|greatest hits|best of|collection|compilation|various|playlist|mixtape|deluxe|remixes?|melodies|classics|specials?|chartbusters?|jukebox|nonstop|mashup|vol)\b|\btop\s*\d+\b|•|·|\baudius\b/i;

// Clean an album/collection name down to a film title (strips soundtrack
// boilerplate). Returns '' when the album isn't a usable movie name.
const cleanMovie = (album) => {
  const raw = String(album || '');
  // "Naatu Naatu (From "RRR")" → the film is RRR itself.
  const from = raw.match(/\(\s*from\s+["“]?([^")”]+)["”]?\s*\)/i);
  let m = from ? from[1] : raw;
  m = m
    .replace(
      /\s*[\(\[]?\s*(original\s+)?(motion picture\s+|theatrical\s+)?(soundtrack|score|ost)\s*[\)\]]?/gi,
      '',
    )
    .replace(/[\(\[][^)\]]*[\)\]]/g, '') // drop remaining (...) / [...]
    .replace(/[\(\)\[\]"“”]/g, '') // strip any leftover stray brackets/quotes
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/[-–:,]+\s*$/, '')
    .trim();
  if (!m || m.length < 2 || NON_MOVIE_RE.test(m)) return '';
  return m;
};

// A movie facet only makes sense for film music. Indian-language albums are
// almost always the film itself; for other languages we require an explicit
// movie/soundtrack signal.
const FILM_LANGUAGES = new Set([
  'telugu', 'hindi', 'tamil', 'kannada', 'malayalam', 'punjabi', 'bengali', 'marathi',
]);

export const singerSlug = (artist) => {
  const s = slugify(artist);
  return s ? SINGER_PREFIX + s : null;
};

// Returns { slug, name } for the movie facet, or null if not film music.
export const movieFacet = ({ album, language, genre, isMovie }) => {
  const filmContext =
    isMovie || FILM_LANGUAGES.has(language) || genreToSlug(genre) === 'movie';
  if (!filmContext) return null;
  const name = cleanMovie(album);
  if (!name) return null;
  const s = slugify(name);
  return s ? { slug: MOVIE_PREFIX + s, name } : null;
};

export const nameFor = (slug) => {
  if (CATEGORY_NAMES[slug]) return CATEGORY_NAMES[slug];
  if (FESTIVAL_NAMES[slug]) return FESTIVAL_NAMES[slug];
  // Strip facet prefixes before title-casing (server supplies the true
  // original name when it can; this is the fallback).
  const bare = slug.startsWith(SINGER_PREFIX)
    ? slug.slice(SINGER_PREFIX.length)
    : slug.startsWith(MOVIE_PREFIX)
      ? slug.slice(MOVIE_PREFIX.length)
      : slug;
  return String(bare)
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
};

export const categoryType = (slug) => {
  if (slug.startsWith(SINGER_PREFIX)) return 'artist';
  if (slug.startsWith(MOVIE_PREFIX)) return 'movie';
  if (DECADE_RE.test(slug)) return 'decade';
  if (FESTIVAL_SLUGS.has(slug)) return 'festival';
  return MOOD_SLUGS.has(slug) ? 'mood' : 'genre';
};

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
