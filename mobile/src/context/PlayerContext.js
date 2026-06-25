import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';

const PlayerContext = createContext(null);

// Repeat cycle: off → all (loop queue) → one (loop current) → off …
const REPEAT_MODES = ['off', 'all', 'one'];

export function PlayerProvider({ children }) {
  const soundRef = useRef(null);
  const loadToken = useRef(0); // guards against overlapping loads when switching fast
  const queueRef = useRef([]); // ref mirrors so status callbacks read fresh values
  const indexRef = useRef(-1);
  const repeatRef = useRef('all');

  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeatMode, setRepeatMode] = useState('all'); // default: auto-play + loop

  const current = index >= 0 ? queue[index] : null;

  useEffect(() => {
    repeatRef.current = repeatMode;
    // Keep the live sound's native loop flag in sync (repeat-one = seamless loop).
    if (soundRef.current) soundRef.current.setIsLoopingAsync(repeatMode === 'one');
  }, [repeatMode]);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    // Keep audio playing when the app is backgrounded or the phone is locked.
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    });
    return () => {
      if (soundRef.current) soundRef.current.unloadAsync();
    };
  }, []);

  // Load + play a song. Hardened so selecting a new song always stops the old
  // one first — no two tracks ever overlap / linger in the background.
  async function loadAndPlay(song) {
    const token = ++loadToken.current;
    try {
      if (soundRef.current) {
        const old = soundRef.current;
        soundRef.current = null;
        await old.unloadAsync().catch(() => {});
      }
      if (!song?.audioUrl) return;
      const { sound } = await Audio.Sound.createAsync(
        { uri: song.audioUrl },
        {
          shouldPlay: true,
          isLooping: repeatRef.current === 'one',
          progressUpdateIntervalMillis: 500,
        },
        (st) => onStatus(st, token),
      );
      // A newer load started while we were awaiting — throw this one away.
      if (token !== loadToken.current) {
        await sound.unloadAsync().catch(() => {});
        return;
      }
      soundRef.current = sound;
      setIsPlaying(true);
    } catch (e) {
      console.warn('Audio error', e.message);
      if (token === loadToken.current) setIsPlaying(false);
    }
  }

  function onStatus(status, token) {
    if (token !== loadToken.current) return; // ignore stale callbacks
    if (!status.isLoaded) return;
    setPosition(status.positionMillis || 0);
    setDuration(status.durationMillis || 0);
    setIsPlaying(status.isPlaying);
    setIsBuffering(!!status.isBuffering);
    // didJustFinish only fires when NOT natively looping (i.e. repeat !== 'one').
    if (status.didJustFinish && !status.isLooping) handleTrackEnd();
  }

  // Auto-advance when a track ends, honouring the repeat mode.
  function handleTrackEnd() {
    const mode = repeatRef.current;
    const q = queueRef.current;
    const i = indexRef.current;
    if (i < 0 || q.length === 0) return;

    const atEnd = i >= q.length - 1;
    if (atEnd && mode === 'off') {
      setIsPlaying(false); // stop at end of queue
      return;
    }
    const ni = (i + 1) % q.length;
    setIndex(ni);
    indexRef.current = ni;
    loadAndPlay(q[ni]);
  }

  // Play a song within a list (the list becomes the queue).
  function playSong(song, list) {
    const q = Array.isArray(list) && list.length ? list : [song];
    const i = Math.max(0, q.findIndex((s) => s.id === song.id));
    setQueue(q);
    setIndex(i);
    queueRef.current = q;
    indexRef.current = i;
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

  // Manual skip — always moves, regardless of repeat mode.
  function next() {
    const q = queueRef.current;
    const i = indexRef.current;
    if (i < 0 || q.length === 0) return;
    const ni = (i + 1) % q.length;
    setIndex(ni);
    indexRef.current = ni;
    loadAndPlay(q[ni]);
  }

  async function prev() {
    // Common UX: if more than 3s into the track, restart it instead of skipping.
    if (soundRef.current) {
      const st = await soundRef.current.getStatusAsync();
      if (st.isLoaded && (st.positionMillis || 0) > 3000) {
        await soundRef.current.setPositionAsync(0);
        return;
      }
    }
    const q = queueRef.current;
    const i = indexRef.current;
    if (i < 0 || q.length === 0) return;
    const pi = (i - 1 + q.length) % q.length;
    setIndex(pi);
    indexRef.current = pi;
    loadAndPlay(q[pi]);
  }

  // Seek to an absolute position (play from a selected second).
  async function seek(millis) {
    if (soundRef.current) {
      await soundRef.current.setPositionAsync(Math.max(0, millis));
    }
  }

  // Jump forward / back by N milliseconds (e.g. +15s / -15s buttons).
  async function seekBy(deltaMillis) {
    const s = soundRef.current;
    if (!s) return;
    const st = await s.getStatusAsync();
    if (!st.isLoaded) return;
    const target = Math.max(
      0,
      Math.min(st.durationMillis || 0, (st.positionMillis || 0) + deltaMillis),
    );
    await s.setPositionAsync(target);
  }

  function cycleRepeat() {
    setRepeatMode(
      (m) => REPEAT_MODES[(REPEAT_MODES.indexOf(m) + 1) % REPEAT_MODES.length],
    );
  }

  return (
    <PlayerContext.Provider
      value={{
        current,
        queue,
        isPlaying,
        isBuffering,
        position,
        duration,
        repeatMode,
        playSong,
        togglePlay,
        next,
        prev,
        seek,
        seekBy,
        cycleRepeat,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);
