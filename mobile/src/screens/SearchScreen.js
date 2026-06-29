import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SongRow from '../components/SongRow';
import { api } from '../api';
import { searchAudius } from '../audius';
import { usePlayer } from '../context/PlayerContext';
import { colors } from '../theme';

export default function SearchScreen() {
  const { playSong } = usePlayer();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState('library'); // 'library' | 'audius'

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = setTimeout(() => {
      // Library = existing backend catalogue search (unchanged).
      // Audius  = live search of the Audius web catalogue.
      const run = source === 'audius' ? searchAudius(term) : api.songs({ q: term });
      run
        .then((r) => setResults(r))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(id);
  }, [query, source]);

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
        {loading ? <ActivityIndicator size="small" color="#000" /> : null}
      </View>

      {/* Source toggle — Library keeps the existing search; Audius is live web */}
      <View style={styles.tabs}>
        {[
          ['library', 'Library'],
          ['audius', 'Audius (online)'],
        ].map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setSource(key)}
            style={[styles.tab, source === key && styles.tabOn]}
          >
            <Text style={[styles.tabText, source === key && styles.tabTextOn]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={results}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingHorizontal: 12 }}
        renderItem={({ item }) => (
          <SongRow song={item} onPress={() => playSong(item, results)} />
        )}
        ListEmptyComponent={
          query && !loading ? (
            <Text style={styles.empty}>
              {source === 'audius'
                ? 'No Audius results. Try another keyword.'
                : 'No matches in your library.'}
            </Text>
          ) : null
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
    marginBottom: 12,
  },
  input: { flex: 1, height: 44, marginLeft: 8, color: '#000', fontSize: 15 },
  tabs: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.surface3,
  },
  tabOn: { backgroundColor: colors.green },
  tabText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  tabTextOn: { color: '#000' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 30 },
});
