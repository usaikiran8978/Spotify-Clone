import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { usePlayer } from '../context/PlayerContext';
import DownloadButton from './DownloadButton';

// Vertical list row (used in search results, category lists, queue).
export default function SongRow({ song, onPress }) {
  const { current, isPlaying } = usePlayer();
  const active = current?.id === song.id;
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Image source={{ uri: song.coverUrl }} style={styles.art} />
      <View style={styles.meta}>
        <Text style={[styles.title, active && { color: colors.green }]} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {song.artist} · {song.language}
        </Text>
      </View>
      <View style={styles.actions}>
        {active && isPlaying && (
          <Ionicons name="volume-high" size={18} color={colors.green} />
        )}
        <DownloadButton song={song} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  art: { width: 48, height: 48, borderRadius: 4, backgroundColor: colors.surface3 },
  meta: { flex: 1, marginLeft: 12 },
  title: { color: colors.text, fontSize: 15, fontWeight: '500' },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
});
