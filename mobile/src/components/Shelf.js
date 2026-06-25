import { FlatList, StyleSheet, Text, View } from 'react-native';
import SongCard from './SongCard';
import { colors } from '../theme';
import { usePlayer } from '../context/PlayerContext';

// A horizontally-scrolling row of cards with a title — the Spotify home shelf.
export default function Shelf({ title, songs }) {
  const { playSong } = usePlayer();
  if (!songs?.length) return null;
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        data={songs}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <SongCard song={item} onPress={() => playSong(item, songs)} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 24 },
  title: { color: colors.text, fontSize: 20, fontWeight: '700', marginLeft: 16, marginBottom: 12 },
});
