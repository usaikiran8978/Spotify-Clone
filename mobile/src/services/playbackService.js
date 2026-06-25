// Background playback service for react-native-track-player.
// Registered in index.js — runs in the headless JS task that keeps audio
// alive when the app is backgrounded / the screen is locked, and wires up
// the lock-screen + notification media controls.
import TrackPlayer, { Event } from 'react-native-track-player';

export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
  TrackPlayer.addEventListener(Event.RemotePrevious, () =>
    TrackPlayer.skipToPrevious(),
  );
  TrackPlayer.addEventListener(Event.RemoteSeek, (e) => TrackPlayer.seekTo(e.position));
  TrackPlayer.addEventListener(Event.RemoteJumpForward, (e) =>
    TrackPlayer.seekBy(e.interval ?? 15),
  );
  TrackPlayer.addEventListener(Event.RemoteJumpBackward, (e) =>
    TrackPlayer.seekBy(-(e.interval ?? 15)),
  );
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
}
