import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SongRow from '../components/SongRow';
import { searchItunes } from '../itunes';
import { searchSaavn, saavnEnabled } from '../jiosaavn';
import { usePlayer } from '../context/PlayerContext';
import { colors } from '../theme';

// Full-length songs via a self-hosted JioSaavn API when configured
// (EXPO_PUBLIC_SAAVN_URL); otherwise live Apple Music 30s previews.
const fullSongs = saavnEnabled();

export default function SearchScreen() {
  const { playSong } = usePlayer();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = setTimeout(() => {
      const run = fullSongs ? searchSaavn(term) : searchItunes(term);
      run
        // If the JioSaavn instance is unreachable, fall back to previews.
        .then((r) => (r.length || !fullSongs ? r : searchItunes(term)))
        .then(setResults)
        .catch(() => searchItunes(term).then(setResults).catch(() => setResults([])))
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(id);
  }, [query]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.h1}>Search</Text>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color="#000" />
        <TextInput
          style={styles.input}
          placeholder="Telugu, Hindi, Tamil, English songs or artists"
          placeholderTextColor="#555"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
        {loading ? <ActivityIndicator size="small" color="#000" /> : null}
      </View>

      <FlatList
        data={results}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingHorizontal: 12 }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <SongRow song={item} onPress={() => playSong(item, results)} />
        )}
        ListEmptyComponent={
          query && !loading ? <Text style={styles.empty}>No matches.</Text> : null
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
