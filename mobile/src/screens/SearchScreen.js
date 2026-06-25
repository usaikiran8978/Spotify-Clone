import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SongRow from '../components/SongRow';
import { api } from '../api';
import { usePlayer } from '../context/PlayerContext';
import { colors } from '../theme';

export default function SearchScreen() {
  const { playSong } = usePlayer();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      api.songs({ q: query.trim() }).then(setResults).catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.h1}>Search</Text>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color="#000" />
        <TextInput
          style={styles.input}
          placeholder="Songs or artists"
          placeholderTextColor="#555"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
      </View>
      <FlatList
        data={results}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingHorizontal: 12 }}
        renderItem={({ item }) => (
          <SongRow song={item} onPress={() => playSong(item, results)} />
        )}
        ListEmptyComponent={
          query ? <Text style={styles.empty}>No matches.</Text> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, paddingTop: 12 },
  h1: { color: colors.text, fontSize: 24, fontWeight: '800', paddingHorizontal: 16, marginBottom: 16 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 6,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  input: { flex: 1, height: 44, marginLeft: 8, color: '#000', fontSize: 15 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 30 },
});
