// Master lists + seed catalogue for the Spotify clone.
// Audio uses free SoundHelix sample tracks so the player actually plays.
// Cover art uses picsum.photos seeded URLs (deterministic per song).

export const LANGUAGES = [
  { code: 'telugu', label: 'Telugu' },
  { code: 'hindi', label: 'Hindi' },
  { code: 'english', label: 'English' },
  { code: 'tamil', label: 'Tamil' },
  { code: 'kannada', label: 'Kannada' },
  { code: 'malayalam', label: 'Malayalam' },
  { code: 'punjabi', label: 'Punjabi' },
];

// type drives how the mobile app groups the shelves on the home screen.
export const CATEGORIES = [
  { slug: '90s', name: "90's", type: 'decade' },
  { slug: '2000s', name: "2000's", type: 'decade' },
  { slug: 'venkatesh', name: 'Venkatesh Hits', type: 'artist' },
  { slug: 'ajith', name: 'Ajith Hits', type: 'artist' },
  { slug: 'telugu', name: 'Telugu', type: 'language' },
  { slug: 'hindi', name: 'Hindi', type: 'language' },
  { slug: 'english', name: 'English', type: 'language' },
  { slug: 'tamil', name: 'Tamil', type: 'language' },
  { slug: 'kannada', name: 'Kannada', type: 'language' },
  { slug: 'malayalam', name: 'Malayalam', type: 'language' },
  { slug: 'punjabi', name: 'Punjabi', type: 'language' },
  { slug: 'sankranthi', name: 'Sankranthi Special', type: 'festival' },
  { slug: 'dj', name: 'DJ / Remix', type: 'mood' },
  { slug: 'friendship', name: 'Friendship', type: 'mood' },
  { slug: 'love', name: 'Love / Melody', type: 'mood' },
  { slug: 'workout', name: 'Workout', type: 'mood' },
];

const AUDIO = (n) =>
  `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3`;
const COVER = (seed) => `https://picsum.photos/seed/${seed}/400/400`;

// Helper to keep the seed list compact.
let _id = 0;
const song = (title, artist, language, categories, year, n) => ({
  id: `seed-${++_id}`,
  title,
  artist,
  album: `${artist} • Collection`,
  language,
  categories,
  year,
  duration: 180 + ((_id * 17) % 120),
  audioUrl: AUDIO(((n - 1) % 16) + 1),
  coverUrl: COVER(`${language}-${_id}`),
  plays: (1000 - _id * 7 + 5000) % 9000,
  createdAt: new Date(2024, 0, 1 + _id).toISOString(),
});

export const SONGS = [
  // ---- Telugu ----
  song('Samajavaragamana', 'Sid Sriram', 'telugu', ['telugu', 'love', '2000s'], 2020, 1),
  song('Inkem Inkem', 'Sid Sriram', 'telugu', ['telugu', 'love'], 2018, 2),
  song('Butta Bomma', 'Armaan Malik', 'telugu', ['telugu', 'dj', '2000s'], 2020, 3),
  song('Ramuloo Ramulaa', 'Anurag Kulkarni', 'telugu', ['telugu', 'dj', 'sankranthi'], 2019, 4),
  song('Naatu Naatu', 'Rahul Sipligunj', 'telugu', ['telugu', 'dj', 'workout'], 2022, 5),
  song('Saami Saami', 'Mounika Yadav', 'telugu', ['telugu', 'love'], 2021, 6),
  song('Cheliya Cheliya', 'Hariharan', 'telugu', ['telugu', 'love', '90s'], 1995, 7),
  song('Snehama Snehama', 'SP Balu', 'telugu', ['telugu', 'friendship', '90s'], 1994, 8),
  song('Kalasala', 'Vijay Prakash', 'telugu', ['telugu', 'venkatesh', '2000s'], 2009, 9),
  song('Bavagaru Bagunnara', 'SP Balu', 'telugu', ['telugu', 'venkatesh', '90s'], 1998, 10),
  song('Aaduvari Matalaku', 'SP Balu', 'telugu', ['telugu', 'venkatesh', '90s'], 1993, 11),
  song('Sankranthi Vachindi', 'Mano', 'telugu', ['telugu', 'sankranthi', 'friendship'], 2001, 12),
  song('Pongal Pandaga', 'Chitra', 'telugu', ['telugu', 'sankranthi'], 2003, 13),

  // ---- Hindi ----
  song('Kesariya', 'Arijit Singh', 'hindi', ['hindi', 'love', '2000s'], 2022, 14),
  song('Tum Hi Ho', 'Arijit Singh', 'hindi', ['hindi', 'love'], 2013, 15),
  song('Channa Mereya', 'Arijit Singh', 'hindi', ['hindi', 'love'], 2016, 16),
  song('Kala Chashma', 'Badshah', 'hindi', ['hindi', 'dj', 'workout'], 2016, 1),
  song('Tip Tip Barsa Paani', 'Udit Narayan', 'hindi', ['hindi', '90s', 'love'], 1994, 2),
  song('Pehla Nasha', 'Udit Narayan', 'hindi', ['hindi', '90s', 'love'], 1992, 3),
  song('Yeh Dosti', 'Kishore Kumar', 'hindi', ['hindi', 'friendship', '90s'], 1990, 4),
  song('Badtameez Dil', 'Benny Dayal', 'hindi', ['hindi', 'dj', '2000s'], 2013, 5),

  // ---- English ----
  song('Blinding Lights', 'The Weeknd', 'english', ['english', 'workout', 'dj'], 2020, 6),
  song('Shape of You', 'Ed Sheeran', 'english', ['english', 'love'], 2017, 7),
  song('Believer', 'Imagine Dragons', 'english', ['english', 'workout'], 2017, 8),
  song('Counting Stars', 'OneRepublic', 'english', ['english', '2000s'], 2013, 9),
  song('Smells Like Teen Spirit', 'Nirvana', 'english', ['english', '90s'], 1991, 10),
  song('Wonderwall', 'Oasis', 'english', ['english', '90s', 'friendship'], 1995, 11),

  // ---- Tamil (incl. Ajith films) ----
  song('Vaseegara', 'Bombay Jayashri', 'tamil', ['tamil', 'love', '2000s'], 2003, 12),
  song('Why This Kolaveri Di', 'Dhanush', 'tamil', ['tamil', 'friendship', 'dj'], 2011, 13),
  song('Mankatha Theme', 'Yuvan Shankar Raja', 'tamil', ['tamil', 'ajith', 'workout'], 2011, 14),
  song('Vaathi Coming', 'Anirudh', 'tamil', ['tamil', 'dj', 'workout'], 2021, 15),
  song('En Veetu Thotathil', 'SP Balu', 'tamil', ['tamil', 'ajith', '90s'], 1996, 16),
  song('Adada Mazhada', 'Karthik', 'tamil', ['tamil', 'ajith', 'love', '2000s'], 2008, 1),
  song('Google Google', 'Devi Sri Prasad', 'tamil', ['tamil', 'ajith', 'dj'], 2012, 2),
];
