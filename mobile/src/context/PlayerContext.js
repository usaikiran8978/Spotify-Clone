import { createContext, useContext, useEffect, useRef, useState } from 'react';
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  RepeatMode,
  useIsPlaying,
  useProgress,
} from 'react-native-track-player';
import { useDownloads } from './DownloadsContext';

const PlayerContext = createContext(null);

// Our repeat vocabulary ↔ RNTP's RepeatMode.
const REPEAT_ORDER = ['off', 'all', 'one'];
const toRntpRepeat = (m) =>
  m === 'one' ? RepeatMode.Track : m === 'all' ? RepeatMode.Queue : RepeatMode.Off;

// Set up the native player exactly once (RNTP throws if set up twice).
let setupPromise = null;
function ensureSetup() {
  if (setupPromise) return setupPromise;
  setupPromise = (async () => {
    try {
      await TrackPlayer.setupPlayer({
        // Auto-pause on interruptions (incoming/active call, other audio apps)
        // and auto-resume when the interruption ends.
        autoHandleInterruptions: true,
      });
    } catch {
      // Already initialised in this JS runtime — fine.
    }
    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior:
          AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.JumpForward,
        Capability.JumpBackward,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
      ],
      progressUpdateEventInterval: 1,
      forwardJumpInterval: 15,
      backwardJumpInterval: 15,
    });
  })();
  return setupPromise;
}

const toTrack = (s, localUri) => ({
  id: String(s.id),
  url: localUri || s.audioUrl, // play the offline copy when downloaded
  title: s.title,
  artist: s.artist,
  album: s.album,
  artwork: s.coverUrl,
  duration: s.duration,
});

export function PlayerProvider({ children }) {
  const { localUriFor } = useDownloads();
  const [queue, setQueue] = useState([]);
  const queueRef = useRef([]);
  const [index, setIndex] = useState(-1);
  const [repeatMode, setRepeatMode] = useState('all'); // default: auto-play + loop queue

  // RNTP hooks (progress is in SECONDS; we expose milliseconds to match the UI).
  const progress = useProgress(500);
  const { playing, bufferingDuringPlay } = useIsPlaying();

  useEffect(() => {
    let mounted = true;
    ensureSetup().then(() => {
      if (mounted) TrackPlayer.setRepeatMode(RepeatMode.Queue);
    });
  }, []);

  // Keep our index in sync as the active track changes (incl. auto-advance).
  useEffect(() => {
    const sub = TrackPlayer.addEventListener(
      Event.PlaybackActiveTrackChanged,
      (e) => {
        if (e?.index != null) setIndex(e.index);
      },
    );
    return () => sub.remove();
  }, []);

  const current = index >= 0 ? queue[index] : null;
  const isPlaying = !!playing;
  const isBuffering = !!bufferingDuringPlay;
  const position = (progress.position || 0) * 1000;
  const duration = (progress.duration || 0) * 1000;

  // Play a song within a list (the list becomes the queue). Replacing the
  // queue stops any current track — no overlap / lingering background audio.
  async function playSong(song, list) {
    const q = Array.isArray(list) && list.length ? list : [song];
    const i = Math.max(0, q.findIndex((s) => s.id === song.id));
    setQueue(q);
    queueRef.current = q;
    setIndex(i);
    await ensureSetup();
    await TrackPlayer.reset();
    await TrackPlayer.add(q.map((s) => toTrack(s, localUriFor(s.id))));
    if (i > 0) await TrackPlayer.skip(i);
    await TrackPlayer.play();
  }

  async function togglePlay() {
    if (playing) await TrackPlayer.pause();
    else await TrackPlayer.play();
  }

  async function next() {
    try {
      await TrackPlayer.skipToNext();
    } catch {
      // at end of queue with repeat off
    }
  }

  async function prev() {
    // If more than 3s into the track, restart it; otherwise go to previous.
    const { position: pos } = await TrackPlayer.getProgress();
    if (pos > 3) {
      await TrackPlayer.seekTo(0);
      return;
    }
    try {
      await TrackPlayer.skipToPrevious();
    } catch {
      await TrackPlayer.seekTo(0);
    }
  }

  // Seek to an absolute position (play from a selected second). Input: ms.
  async function seek(millis) {
    await TrackPlayer.seekTo(Math.max(0, millis) / 1000);
  }

  // Jump forward / back by N milliseconds (±15s buttons).
  async function seekBy(deltaMillis) {
    await TrackPlayer.seekBy(deltaMillis / 1000);
  }

  function cycleRepeat() {
    setRepeatMode((m) => {
      const nm = REPEAT_ORDER[(REPEAT_ORDER.indexOf(m) + 1) % REPEAT_ORDER.length];
      TrackPlayer.setRepeatMode(toRntpRepeat(nm));
      return nm;
    });
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
