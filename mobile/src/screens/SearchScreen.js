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
import { api } from '../api';
import {
  searchAudius,
  searchAudiusArtists,
  searchAudiusAlbums,
  getArtistSongs,
  getAlbumSongs,
} from '../audius';
import { usePlayer } from '../context/PlayerContext';
import { colors } from '../theme';

const fmtCount = (n) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : `${n}`;

export default function SearchScreen() {
  const { playSong } = usePlayer();
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('library'); // 'library' | 'audius'
  const [audiusType, setAudiusType] = useState('songs'); // 'songs' | 'artists' | 'albums'
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null); // { title, songs } drill-in

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
      let p;
      if (source === 'library') p = api.songs({ q: term });
      else if (audiusType === 'artists') p = searchAudiusArtists(term);
      else if (audiusType === 'albums') p = searchAudiusAlbums(term);
      else p = searchAudius(term);
      p.then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(id);
  }, [query, source, audiusType]);

  function openCollection(title, fetcher) {
    setLoading(true);
    fetcher
      .then((songs) => setDetail({ title, songs }))
      .catch(() => setDetail({ title, songs: [] }))
      .finally(() => setLoading(false));
  }

  const Pill = ({ active, label, onPress }) => (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabOn]}>
      <Text style={[styles.tabText, active && styles.tabTextOn]}>{label}</Text>
    </Pressable>
  );

  // ---- Drill-in: an artist's or album's songs ----
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
          ListEmptyComponent={
            !loading ? <Text style={styles.empty}>No songs.</Text> : null
          }
          renderItem={({ item }) => (
            <SongRow song={item} onPress={() => playSong(item, detail.songs)} />
          )}
        />
      </View>
    );
  }

  const showArtists = source === 'audius' && audiusType === 'artists';
  const showAlbums = source === 'audius' && audiusType === 'albums';

  return (
    <View style={styles.wrap}>
      <Text style={styles.h1}>Search</Text>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color="#000" />
        <TextInput
          style={styles.input}
          placeholder="Songs, artists, albums"
          placeholderTextColor="#555"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
        {loading ? <ActivityIndicator size="small" color="#000" /> : null}
      </View>

      {/* Source toggle — Library keeps the existing search */}
      <View style={styles.tabs}>
        <Pill active={source === 'library'} label="Library" onPress={() => setSource('library')} />
        <Pill
          active={source === 'audius'}
          label="Audius (online)"
          onPress={() => setSource('audius')}
        />
      </View>

      {/* Audius sub-type — Songs / Artists / Albums */}
      {source === 'audius' && (
        <View style={styles.tabs}>
          {['songs', 'artists', 'albums'].map((t) => (
            <Pill
              key={t}
              active={audiusType === t}
              label={t[0].toUpperCase() + t.slice(1)}
              onPress={() => setAudiusType(t)}
            />
          ))}
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 12 }}
        ListEmptyComponent={
          query && !loading ? <Text style={styles.empty}>No results.</Text> : null
        }
        renderItem={({ item }) => {
          if (showArtists) {
            return (
              <Pressable
                style={styles.collRow}
                onPress={() => openCollection(item.name, getArtistSongs(item.id))}
              >
                {item.picture ? (
                  <Image source={{ uri: item.picture }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.ph]}>
                    <Ionicons name="person" size={20} color={colors.faint} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.collName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.collSub}>{fmtCount(item.followers)} followers</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.faint} />
              </Pressable>
            );
          }
          if (showAlbums) {
            return (
              <Pressable
                style={styles.collRow}
                onPress={() => openCollection(item.name, getAlbumSongs(item.id))}
              >
                {item.art ? (
                  <Image source={{ uri: item.art }} style={styles.albumArt} />
                ) : (
                  <View style={[styles.albumArt, styles.ph]}>
                    <Ionicons name="albums" size={20} color={colors.faint} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.collName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.collSub} numberOfLines={1}>
                    {item.isAlbum ? 'Album' : 'Playlist'}
                    {item.owner ? ` · ${item.owner}` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.faint} />
              </Pressable>
            );
          }
          return <SongRow song={item} onPress={() => playSong(item, results)} />;
        }}
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
  tab: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.surface3 },
  tabOn: { backgroundColor: colors.green },
  tabText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  tabTextOn: { color: '#000' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 30 },
  collRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 4 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface3 },
  albumArt: { width: 48, height: 48, borderRadius: 4, backgroundColor: colors.surface3 },
  ph: { alignItems: 'center', justifyContent: 'center' },
  collName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  collSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
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
