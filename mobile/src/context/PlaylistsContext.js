import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@spotifyclone/playlists';
const PlaylistsContext = createContext(null);

let counter = 0;
const newId = () => `pl_${Date.now()}_${counter++}`;

export function PlaylistsProvider({ children }) {
  // [{ id, name, songs: [songObject] }]
  const [playlists, setPlaylists] = useState([]);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => v && setPlaylists(JSON.parse(v)))
      .catch(() => {});
  }, []);

  const save = (next) => {
    setPlaylists(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  };

  function createPlaylist(name) {
    const playlist = { id: newId(), name: name.trim() || 'New Playlist', songs: [] };
    save([...playlists, playlist]);
    return playlist;
  }

  function deletePlaylist(id) {
    save(playlists.filter((p) => p.id !== id));
  }

  function renamePlaylist(id, name) {
    save(playlists.map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p)));
  }

  // Add a song (deduped by id). Returns false if it was already there.
  function addToPlaylist(id, song) {
    let added = false;
    save(
      playlists.map((p) => {
        if (p.id !== id) return p;
        if (p.songs.some((s) => s.id === song.id)) return p;
        added = true;
        return { ...p, songs: [...p.songs, song] };
      }),
    );
    return added;
  }

  function removeFromPlaylist(id, songId) {
    save(
      playlists.map((p) =>
        p.id === id ? { ...p, songs: p.songs.filter((s) => s.id !== songId) } : p,
      ),
    );
  }

  const isInPlaylist = (id, songId) =>
    playlists.find((p) => p.id === id)?.songs.some((s) => s.id === songId) || false;

  return (
    <PlaylistsContext.Provider
      value={{
        playlists,
        createPlaylist,
        deletePlaylist,
        renamePlaylist,
        addToPlaylist,
        removeFromPlaylist,
        isInPlaylist,
      }}
    >
      {children}
    </PlaylistsContext.Provider>
  );
}

export const usePlaylists = () => useContext(PlaylistsContext);
