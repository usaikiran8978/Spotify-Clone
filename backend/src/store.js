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

// De-dupe key for bulk imports — same title+artist is treated as one song.
const dupeKey = (s) => `${s.title}|${s.artist}`.trim().toLowerCase();

// Admin-editable branding the mobile app fetches at runtime. Changing this in
// the admin panel re-brands the app live (in-app logo/name) without a rebuild.
const DEFAULT_BRANDING = {
  appName: 'Melody',
  tagline: 'Play the music you love',
  logoUrl: '',
  accent: '#22C55E',
};

// Latest app release the mobile app self-updates to (Android APK).
const DEFAULT_RELEASE = { version: '1.0.0', notes: '', updatedAt: null };
const APK_FILE = path.join(__dirname, '..', 'uploads', 'app.apk');

let impl; // set by init()

// ---------------------------------------------------------------- JSON mode
function jsonStore() {
  let songs;
  let branding = { ...DEFAULT_BRANDING };
  let release = { ...DEFAULT_RELEASE };
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      songs = data.songs;
      if (data.branding) branding = { ...DEFAULT_BRANDING, ...data.branding };
      if (data.release) release = { ...DEFAULT_RELEASE, ...data.release };
    } catch {
      songs = null;
    }
  }
  if (!Array.isArray(songs)) songs = [...SONGS];
  const persist = () =>
    fs.writeFileSync(DB_FILE, JSON.stringify({ songs, branding, release }, null, 2));
  persist();

  return {
    async getBranding() {
      return branding;
    },
    async setBranding(patch) {
      branding = { ...branding, ...patch };
      persist();
      return branding;
    },
    async getRelease() {
      return { ...release, hasApk: fs.existsSync(APK_FILE) };
    },
    async setRelease(patch) {
      release = { ...release, ...patch, updatedAt: new Date().toISOString() };
      persist();
      return this.getRelease();
    },
    async saveApk(buffer) {
      fs.mkdirSync(path.dirname(APK_FILE), { recursive: true });
      fs.writeFileSync(APK_FILE, buffer);
    },
    async getApk() {
      if (!fs.existsSync(APK_FILE)) return null;
      return { stream: fs.createReadStream(APK_FILE), length: fs.statSync(APK_FILE).size };
    },
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
    async removeSongs(ids) {
      const set = new Set(ids);
      const before = songs.length;
      songs = songs.filter((s) => !set.has(s.id));
      persist();
      return before - songs.length;
    },
    async clearSongs() {
      const n = songs.length;
      songs = [];
      persist();
      return n;
    },
    async reseed() {
      songs = [...SONGS];
      persist();
      return songs.length;
    },
    async addSongs(incoming) {
      const have = new Set(songs.map(dupeKey));
      let added = 0;
      for (const s of incoming) {
        const k = dupeKey(s);
        if (have.has(k)) continue;
        have.add(k);
        songs.unshift(s);
        added++;
      }
      persist();
      return { added, skipped: incoming.length - added, total: songs.length };
    },
  };
}

// --------------------------------------------------------------- Mongo mode
async function mongoStore() {
  const { MongoClient, GridFSBucket } = await import('mongodb');
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'spotifyclone');
  const coll = db.collection('songs');
  const settings = db.collection('settings');
  const apkBucket = new GridFSBucket(db, { bucketName: 'apk' });
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
    async getBranding() {
      const doc = await settings.findOne({ _id: 'branding' });
      return { ...DEFAULT_BRANDING, ...(doc?.value || {}) };
    },
    async setBranding(patch) {
      const current = await this.getBranding();
      const value = { ...current, ...patch };
      await settings.updateOne(
        { _id: 'branding' },
        { $set: { value } },
        { upsert: true },
      );
      return value;
    },
    async getRelease() {
      const doc = await settings.findOne({ _id: 'release' });
      const hasApk = (await db.collection('apk.files').countDocuments()) > 0;
      return { ...DEFAULT_RELEASE, ...(doc?.value || {}), hasApk };
    },
    async setRelease(patch) {
      const cur = await this.getRelease();
      const value = { ...cur, ...patch, updatedAt: new Date().toISOString() };
      delete value.hasApk;
      await settings.updateOne({ _id: 'release' }, { $set: { value } }, { upsert: true });
      return this.getRelease();
    },
    async saveApk(buffer) {
      // Replace any existing APK, then store the new one.
      const old = await db.collection('apk.files').find({}).toArray();
      for (const f of old) await apkBucket.delete(f._id).catch(() => {});
      await new Promise((resolve, reject) => {
        const up = apkBucket.openUploadStream('app.apk');
        up.on('finish', resolve);
        up.on('error', reject);
        up.end(buffer);
      });
    },
    async getApk() {
      const file = await db.collection('apk.files').findOne({}, { sort: { uploadDate: -1 } });
      if (!file) return null;
      return { stream: apkBucket.openDownloadStream(file._id), length: file.length };
    },
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
    async removeSongs(ids) {
      const r = await coll.deleteMany({ id: { $in: ids } });
      return r.deletedCount;
    },
    async clearSongs() {
      const r = await coll.deleteMany({});
      return r.deletedCount;
    },
    async reseed() {
      await coll.deleteMany({});
      await coll.insertMany(SONGS.map((s) => ({ ...s })));
      return SONGS.length;
    },
    async addSongs(incoming) {
      const existing = await coll
        .find({}, { projection: { title: 1, artist: 1 } })
        .toArray();
      const have = new Set(existing.map(dupeKey));
      const fresh = [];
      for (const s of incoming) {
        const k = dupeKey(s);
        if (have.has(k)) continue;
        have.add(k);
        fresh.push({ ...s });
      }
      if (fresh.length) await coll.insertMany(fresh);
      const total = await coll.countDocuments();
      return { added: fresh.length, skipped: incoming.length - fresh.length, total };
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
  removeSongs: (...a) => impl.removeSongs(...a),
  clearSongs: (...a) => impl.clearSongs(...a),
  reseed: (...a) => impl.reseed(...a),
  addSongs: (...a) => impl.addSongs(...a),
  getBranding: (...a) => impl.getBranding(...a),
  setBranding: (...a) => impl.setBranding(...a),
  getRelease: (...a) => impl.getRelease(...a),
  setRelease: (...a) => impl.setRelease(...a),
  saveApk: (...a) => impl.saveApk(...a),
  getApk: (...a) => impl.getApk(...a),
};
