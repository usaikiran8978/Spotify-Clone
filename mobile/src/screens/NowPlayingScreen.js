import { useRef } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';
import { colors, accentFor } from '../theme';

const fmt = (ms) => {
  const s = Math.floor((ms || 0) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const SEEK_STEP = 15000; // ±15 seconds

export default function NowPlayingScreen({ onClose }) {
  const {
    current,
    isPlaying,
    togglePlay,
    next,
    prev,
    position,
    duration,
    seek,
    seekBy,
    repeatMode,
    cycleRepeat,
  } = usePlayer();
  const trackWidth = useRef(0);
  if (!current) return null;
  const pct = duration ? Math.min(1, position / duration) : 0;
  const repeatActive = repeatMode !== 'off';

  return (
    <View style={[styles.wrap, { backgroundColor: accentFor(current.id) }]}>
      <View style={styles.topbar}>
        <Pressable onPress={onClose} hitSlop={12}>
          <Ionicons name="chevron-down" size={28} color="#fff" />
        </Pressable>
        <Text style={styles.topTitle}>NOW PLAYING</Text>
        <Ionicons name="ellipsis-horizontal" size={22} color="#fff" />
      </View>

      <Image source={{ uri: current.coverUrl }} style={styles.art} />

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {current.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {current.artist}
        </Text>
      </View>

      {/* Progress bar — tap anywhere to play from that position. */}
      <Pressable
        style={styles.track}
        onLayout={(e) => {
          trackWidth.current = e.nativeEvent.layout.width;
        }}
        onPress={(e) => {
          const w = trackWidth.current || 1;
          const x = e.nativeEvent.locationX;
          if (duration) seek(Math.max(0, Math.min(1, x / w)) * duration);
        }}
      >
        <View style={styles.trackBg}>
          <View style={[styles.trackFill, { width: `${pct * 100}%` }]} />
        </View>
      </Pressable>
      <View style={styles.times}>
        <Text style={styles.time}>{fmt(position)}</Text>
        <Text style={styles.time}>{fmt(duration)}</Text>
      </View>

      <View style={styles.controls}>
        <Pressable onPress={prev} hitSlop={10}>
          <Ionicons name="play-skip-back" size={32} color="#fff" />
        </Pressable>
        <Pressable onPress={() => seekBy(-SEEK_STEP)} hitSlop={10} style={styles.seekBtn}>
          <Ionicons name="play-back" size={26} color="#fff" />
          <Text style={styles.seekLabel}>15</Text>
        </Pressable>
        <Pressable onPress={togglePlay} style={styles.playBtn}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={36} color="#000" />
        </Pressable>
        <Pressable onPress={() => seekBy(SEEK_STEP)} hitSlop={10} style={styles.seekBtn}>
          <Ionicons name="play-forward" size={26} color="#fff" />
          <Text style={styles.seekLabel}>15</Text>
        </Pressable>
        <Pressable onPress={next} hitSlop={10}>
          <Ionicons name="play-skip-forward" size={32} color="#fff" />
        </Pressable>
      </View>

      {/* Repeat toggle: off → loop queue → loop one. */}
      <View style={styles.secondaryRow}>
        <Pressable onPress={cycleRepeat} hitSlop={12} style={styles.repeatBtn}>
          <Ionicons
            name="repeat"
            size={22}
            color={repeatActive ? '#fff' : 'rgba(255,255,255,0.4)'}
          />
          {repeatMode === 'one' && <Text style={styles.repeatOne}>1</Text>}
          <Text style={[styles.repeatLabel, { opacity: repeatActive ? 1 : 0.5 }]}>
            {repeatMode === 'one'
              ? 'Repeat one'
              : repeatMode === 'all'
                ? 'Loop queue'
                : 'Repeat off'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 24, paddingTop: 56 },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topTitle: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  art: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    marginTop: 40,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  info: { marginTop: 32 },
  title: { color: '#fff', fontSize: 26, fontWeight: '800' },
  artist: { color: 'rgba(255,255,255,0.8)', fontSize: 16, marginTop: 6 },
  track: { marginTop: 28, paddingVertical: 8 },
  trackBg: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' },
  trackFill: { height: 4, borderRadius: 2, backgroundColor: '#fff' },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 28,
  },
  seekBtn: { alignItems: 'center', justifyContent: 'center' },
  seekLabel: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    marginTop: -4,
  },
  playBtn: {
    backgroundColor: '#fff',
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  repeatBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  repeatOne: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    marginLeft: -4,
    marginTop: -10,
  },
  repeatLabel: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
