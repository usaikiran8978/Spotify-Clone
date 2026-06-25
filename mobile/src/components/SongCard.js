import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

// Horizontal "shelf" card (album-art on top, title below).
export default function SongCard({ song, onPress }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Image source={{ uri: song.coverUrl }} style={styles.art} />
      <Text style={styles.title} numberOfLines={1}>
        {song.title}
      </Text>
      <Text style={styles.artist} numberOfLines={1}>
        {song.artist}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: 150, marginRight: 14 },
  art: { width: 150, height: 150, borderRadius: 8, backgroundColor: colors.surface3 },
  title: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 8 },
  artist: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
