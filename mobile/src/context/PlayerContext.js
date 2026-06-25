import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const soundRef = useRef(null);
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const current = index >= 0 ? queue[index] : null;

  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });
    return () => {
      if (soundRef.current) soundRef.current.unloadAsync();
    };
  }, []);

  async function loadAndPlay(song) {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      if (!song?.audioUrl) return;
      const { sound } = await Audio.Sound.createAsync(
        { uri: song.audioUrl },
        { shouldPlay: true },
        onStatus,
      );
      soundRef.current = sound;
      setIsPlaying(true);
    } catch (e) {
      console.warn('Audio error', e.message);
      setIsPlaying(false);
    }
  }

  function onStatus(status) {
    if (!status.isLoaded) return;
    setPosition(status.positionMillis || 0);
    setDuration(status.durationMillis || 0);
    setIsPlaying(status.isPlaying);
    if (status.didJustFinish) next();
  }

  // Play a song within a list (the list becomes the queue).
  function playSong(song, list) {
    const q = Array.isArray(list) && list.length ? list : [song];
    const i = Math.max(0, q.findIndex((s) => s.id === song.id));
    setQueue(q);
    setIndex(i);
    loadAndPlay(q[i]);
  }

  async function togglePlay() {
    const s = soundRef.current;
    if (!s) {
      if (current) loadAndPlay(current);
      return;
    }
    const status = await s.getStatusAsync();
    if (status.isPlaying) {
      await s.pauseAsync();
      setIsPlaying(false);
    } else {
      await s.playAsync();
      setIsPlaying(true);
    }
  }

  function next() {
    setIndex((i) => {
      if (i < 0 || queue.length === 0) return i;
      const ni = (i + 1) % queue.length;
      loadAndPlay(queue[ni]);
      return ni;
    });
  }

  function prev() {
    setIndex((i) => {
      if (i < 0 || queue.length === 0) return i;
      const pi = (i - 1 + queue.length) % queue.length;
      loadAndPlay(queue[pi]);
      return pi;
    });
  }

  async function seek(millis) {
    if (soundRef.current) await soundRef.current.setPositionAsync(millis);
  }

  return (
    <PlayerContext.Provider
      value={{
        current,
        queue,
        isPlaying,
        position,
        duration,
        playSong,
        togglePlay,
        next,
        prev,
        seek,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);
