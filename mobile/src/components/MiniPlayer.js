import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { usePlayer } from '../context/PlayerContext';
import { useRoom } from '../context/RoomContext';

export default function MiniPlayer({ onOpen }) {
  const { current, isPlaying, togglePlay, next } = usePlayer();
  const { isFollower } = useRoom();
  if (!current) return null;
  return (
    <Pressable style={styles.bar} onPress={onOpen}>
      <Image source={{ uri: current.coverUrl }} style={styles.art} />
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={1}>
          {current.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {current.artist}
        </Text>
      </View>
      {isFollower ? (
        // In a room as a listener: the host controls playback.
        <Ionicons name="radio" size={22} color={colors.green} />
      ) : (
        <>
          <Pressable hitSlop={10} onPress={togglePlay}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={26} color={colors.text} />
          </Pressable>
          <Pressable hitSlop={10} onPress={next} style={{ marginLeft: 18 }}>
            <Ionicons name="play-skip-forward" size={22} color={colors.text} />
          </Pressable>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface3,
    marginHorizontal: 8,
    borderRadius: 8,
    padding: 8,
  },
  art: { width: 44, height: 44, borderRadius: 4, backgroundColor: colors.surface2 },
  meta: { flex: 1, marginLeft: 10 },
  title: { color: colors.text, fontSize: 14, fontWeight: '600' },
  artist: { color: colors.muted, fontSize: 12 },
});
