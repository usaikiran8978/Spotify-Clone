// Data layer with two interchangeable backends:
//   - MongoDB  (when MONGODB_URI is set)  → persistent, used in production
//   - JSON file (otherwise)               → zero-config local dev
//
// Categories & languages are static reference data (from seedData) in both
// modes; only the song catalogue is stored/mutated.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SONGS, CATEGORIES, LANGUAGES } from './seedData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, '..', 'data.json');
const useMongo = !!process.env.MONGODB_URI;

let impl; // set by init()

// ---------------------------------------------------------------- JSON mode
function jsonStore() {
  let songs;
  if (fs.existsSync(DB_FILE)) {
    try {
      songs = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')).songs;
    } catch {
      songs = null;
    }
  }
  if (!Array.isArray(songs)) songs = [...SONGS];
  const persist = () => fs.writeFileSync(DB_FILE, JSON.stringify({ songs }, null, 2));
  persist();

  return {
    async allSongs() {
      return songs;
    },
    async addSong(song) {
      songs.unshift(song);
      persist();
      return song;
    },
    async updateSong(id, patch) {
      const i = songs.findIndex((s) => s.id === id);
      if (i === -1) return null;
      songs[i] = { ...songs[i], ...patch, id };
      persist();
      return songs[i];
    },
    async removeSong(id) {
      const before = songs.length;
      songs = songs.filter((s) => s.id !== id);
      persist();
      return songs.length < before;
    },
    async reseed() {
      songs = [...SONGS];
      persist();
      return songs.length;
    },
  };
}

// --------------------------------------------------------------- Mongo mode
async function mongoStore() {
  const { MongoClient } = await import('mongodb');
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'spotifyclone');
  const coll = db.collection('songs');
  await coll.createIndex({ id: 1 }, { unique: true });

  // Seed once if empty.
  if ((await coll.countDocuments()) === 0) {
    await coll.insertMany(SONGS.map((s) => ({ ...s })));
  }
  const clean = (doc) => {
    if (!doc) return doc;
    const { _id, ...rest } = doc;
    return rest;
  };

  return {
    async allSongs() {
      return (await coll.find({}).toArray()).map(clean);
    },
    async addSong(song) {
      await coll.insertOne({ ...song });
      return song;
    },
    async updateSong(id, patch) {
      const { id: _drop, ...rest } = patch;
      const r = await coll.findOneAndUpdate(
        { id },
        { $set: rest },
        { returnDocument: 'after' },
      );
      return clean(r && (r.value || r));
    },
    async removeSong(id) {
      const r = await coll.deleteOne({ id });
      return r.deletedCount > 0;
    },
    async reseed() {
      await coll.deleteMany({});
      await coll.insertMany(SONGS.map((s) => ({ ...s })));
      return SONGS.length;
    },
  };
}

export const store = {
  categories: CATEGORIES,
  languages: LANGUAGES,
  async init() {
    impl = useMongo ? await mongoStore() : jsonStore();
    console.log(`📦  Storage: ${useMongo ? 'MongoDB' : 'JSON file'}`);
  },
  allSongs: (...a) => impl.allSongs(...a),
  addSong: (...a) => impl.addSong(...a),
  updateSong: (...a) => impl.updateSong(...a),
  removeSong: (...a) => impl.removeSong(...a),
  reseed: (...a) => impl.reseed(...a),
};
