import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SongRow from '../components/SongRow';
import { searchItunes } from '../itunes';
import { searchSaavn, searchSaavnArtists, getArtistSongs, saavnEnabled } from '../jiosaavn';
import { usePlayer } from '../context/PlayerContext';
import { colors } from '../theme';

// Full-length songs via JioSaavn when configured, else iTunes 30s previews.
const fullSongs = saavnEnabled();

export default function SearchScreen() {
  const { playSong } = usePlayer();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('songs'); // 'songs' | 'artists'
  const [results, setResults] = useState([]); // songs or artists per tab
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null); // { title, songs } when an artist is opened

  useEffect(() => {
    const term = query.trim();
    setDetail(null);
    if (!term) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = setTimeout(() => {
      if (tab === 'artists') {
        searchSaavnArtists(term)
          .then(setResults)
          .catch(() => setResults([]))
          .finally(() => setLoading(false));
      } else {
        const run = fullSongs ? searchSaavn(term) : searchItunes(term);
        run
          .then((r) => (r.length || !fullSongs ? r : searchItunes(term)))
          .then(setResults)
          .catch(() => searchItunes(term).then(setResults).catch(() => setResults([])))
          .finally(() => setLoading(false));
      }
    }, 350);
    return () => clearTimeout(id);
  }, [query, tab]);

  function openArtist(artist) {
    setLoading(true);
    getArtistSongs(artist.id)
      .then((songs) => setDetail({ title: artist.name, songs }))
      .catch(() => setDetail({ title: artist.name, songs: [] }))
      .finally(() => setLoading(false));
  }

  // ---- An artist's songs ----
  if (detail) {
    return (
      <View style={styles.wrap}>
        <View style={styles.detailHead}>
          <Pressable onPress={() => setDetail(null)} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
          <Text style={styles.detailTitle} numberOfLines={1}>
            {detail.title}
          </Text>
        </View>
        {detail.songs.length > 0 && (
          <Pressable
            style={styles.playAll}
            onPress={() => playSong(detail.songs[0], detail.songs)}
          >
            <Ionicons name="play" size={16} color="#000" />
            <Text style={styles.playAllText}>Play all</Text>
          </Pressable>
        )}
        <FlatList
          data={detail.songs}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ paddingHorizontal: 12 }}
          ListEmptyComponent={!loading ? <Text style={styles.empty}>No songs.</Text> : null}
          renderItem={({ item }) => (
            <SongRow song={item} onPress={() => playSong(item, detail.songs)} />
          )}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.h1}>Search</Text>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color="#000" />
        <TextInput
          style={styles.input}
          placeholder={tab === 'artists' ? 'Search artists' : 'Songs or artists'}
          placeholderTextColor="#555"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
        {loading ? <ActivityIndicator size="small" color="#000" /> : null}
      </View>

      <View style={styles.tabs}>
        {[
          ['songs', 'Songs'],
          ['artists', 'Artists'],
        ].map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            style={[styles.tab, tab === key && styles.tabOn]}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 12 }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          query && !loading ? <Text style={styles.empty}>No results.</Text> : null
        }
        renderItem={({ item }) =>
          tab === 'artists' ? (
            <Pressable style={styles.artistRow} onPress={() => openArtist(item)}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.ph]}>
                  <Ionicons name="person" size={20} color={colors.faint} />
                </View>
              )}
              <Text style={styles.artistName} numberOfLines={1}>
                {item.name}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.faint} />
            </Pressable>
          ) : (
            <SongRow song={item} onPress={() => playSong(item, results)} />
          )
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
  tab: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 16, backgroundColor: colors.surface3 },
  tabOn: { backgroundColor: colors.green },
  tabText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  tabTextOn: { color: '#000' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 30 },
  artistRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 4 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.surface3 },
  ph: { alignItems: 'center', justifyContent: 'center' },
  artistName: { color: colors.text, fontSize: 16, fontWeight: '600', flex: 1 },
  detailHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, marginBottom: 8 },
  detailTitle: { color: colors.text, fontSize: 22, fontWeight: '800', flex: 1 },
  playAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.green,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 22,
    marginLeft: 12,
    marginBottom: 10,
  },
  playAllText: { color: '#000', fontWeight: '800', fontSize: 14 },
});
