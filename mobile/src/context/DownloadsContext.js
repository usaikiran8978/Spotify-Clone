import { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

const KEY = '@spotifyclone/downloads';
const DIR = 'downloads/'; // relative to documentDirectory

const DownloadsContext = createContext(null);

const extFor = (song) => (String(song?.audioUrl).includes('.m4a') ? 'm4a' : 'mp3');
const mimeFor = (song) => (extFor(song) === 'm4a' ? 'audio/mp4' : 'audio/mpeg');
const safeName = (s) =>
  String(s || 'track')
    .replace(/[^\w\- ]+/g, '')
    .trim()
    .slice(0, 60) || 'track';

export function DownloadsProvider({ children }) {
  // Persisted as { [songId]: { song, file } } where file is RELATIVE to the
  // document dir (absolute paths can change across app updates on iOS).
  const [downloaded, setDownloaded] = useState({});
  const [busyIds, setBusyIds] = useState([]); // song ids being downloaded

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => v && setDownloaded(JSON.parse(v)))
      .catch(() => {});
  }, []);

  const persist = (next) => AsyncStorage.setItem(KEY, JSON.stringify(next));
  const setBusy = (id, on) =>
    setBusyIds((ids) => (on ? [...ids, id] : ids.filter((x) => x !== id)));

  const isOffline = (id) => !!downloaded[id];
  const isBusy = (id) => busyIds.includes(id);
  const localUriFor = (id) =>
    downloaded[id] ? FileSystem.documentDirectory + downloaded[id].file : null;
  const offlineList = Object.values(downloaded).map((d) => d.song);

  // Save inside the app for offline playback (app-private storage).
  async function downloadOffline(song) {
    if (downloaded[song.id] || isBusy(song.id)) return;
    setBusy(song.id, true);
    try {
      const dir = FileSystem.documentDirectory + DIR;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
      const file = `${DIR}${song.id}.${extFor(song)}`;
      const res = await FileSystem.downloadAsync(song.audioUrl, FileSystem.documentDirectory + file);
      if (res.status && res.status >= 400) throw new Error(`Download failed (${res.status})`);
      const next = { ...downloaded, [song.id]: { song, file } };
      setDownloaded(next);
      await persist(next);
    } finally {
      setBusy(song.id, false);
    }
  }

  // Save to the device storage (visible outside the app).
  //   Android → media library (Music). iOS → share sheet → Files/other apps.
  async function downloadToDevice(song) {
    setBusy(song.id, true);
    const temp = `${FileSystem.cacheDirectory}${safeName(song.title)}.${extFor(song)}`;
    try {
      const local = localUriFor(song.id);
      if (local) {
        await FileSystem.copyAsync({ from: local, to: temp });
      } else {
        const res = await FileSystem.downloadAsync(song.audioUrl, temp);
        if (res.status && res.status >= 400) throw new Error(`Download failed (${res.status})`);
      }

      if (Platform.OS === 'android') {
        const perm = await MediaLibrary.requestPermissionsAsync();
        if (!perm.granted) throw new Error('Storage permission denied');
        await MediaLibrary.createAssetAsync(temp);
      } else {
        if (!(await Sharing.isAvailableAsync()))
          throw new Error('Sharing is not available on this device');
        await Sharing.shareAsync(temp, {
          mimeType: mimeFor(song),
          dialogTitle: `Save ${song.title}`,
        });
      }
    } finally {
      FileSystem.deleteAsync(temp, { idempotent: true }).catch(() => {});
      setBusy(song.id, false);
    }
  }

  async function removeOffline(song) {
    const entry = downloaded[song.id];
    if (entry) {
      await FileSystem.deleteAsync(FileSystem.documentDirectory + entry.file, {
        idempotent: true,
      }).catch(() => {});
    }
    const next = { ...downloaded };
    delete next[song.id];
    setDownloaded(next);
    await persist(next);
  }

  return (
    <DownloadsContext.Provider
      value={{
        downloaded,
        offlineList,
        isOffline,
        isBusy,
        localUriFor,
        downloadOffline,
        downloadToDevice,
        removeOffline,
      }}
    >
      {children}
    </DownloadsContext.Provider>
  );
}

export const useDownloads = () => useContext(DownloadsContext);
