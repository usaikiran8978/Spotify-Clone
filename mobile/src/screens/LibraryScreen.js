import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import SongRow from '../components/SongRow';
import { api } from '../api';
import { usePlayer } from '../context/PlayerContext';
import { colors } from '../theme';

// "All songs" view — the flat catalogue, newest first.
export default function LibraryScreen() {
  const { playSong } = usePlayer();
  const [songs, setSongs] = useState([]);

  useEffect(() => {
    api.songs({ sort: 'latest' }).then(setSongs).catch(() => setSongs([]));
  }, []);

  return (
    <View style={styles.wrap}>
      <FlatList
        data={songs}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        ListHeaderComponent={
          <Text style={styles.h1}>All songs · {songs.length}</Text>
        }
        renderItem={({ item }) => (
          <SongRow song={item} onPress={() => playSong(item, songs)} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, paddingTop: 12 },
  h1: { color: colors.text, fontSize: 24, fontWeight: '800', marginBottom: 12, paddingHorizontal: 4 },
});
