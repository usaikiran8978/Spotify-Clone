import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import SongRow from '../components/SongRow';
import { api } from '../api';
import { usePlayer } from '../context/PlayerContext';
import { useDownloads } from '../context/DownloadsContext';
import { colors } from '../theme';

// "All songs" + a "Downloaded" tab (offline songs, playable without network).
export default function LibraryScreen() {
  const { playSong } = usePlayer();
  const { offlineList } = useDownloads();
  const [songs, setSongs] = useState([]);
  const [tab, setTab] = useState('all'); // 'all' | 'downloaded'

  useEffect(() => {
    api.songs({ sort: 'latest' }).then(setSongs).catch(() => setSongs([]));
  }, []);

  const list = tab === 'downloaded' ? offlineList : songs;

  return (
    <View style={styles.wrap}>
      <View style={styles.tabs}>
        <Pressable onPress={() => setTab('all')} style={styles.tab}>
          <Text style={[styles.tabText, tab === 'all' && styles.tabActive]}>
            All songs
          </Text>
        </Pressable>
        <Pressable onPress={() => setTab('downloaded')} style={styles.tab}>
          <Text style={[styles.tabText, tab === 'downloaded' && styles.tabActive]}>
            Downloaded · {offlineList.length}
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={list}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {tab === 'downloaded'
              ? 'No downloads yet. Tap the ⬇ icon on any song to save it offline.'
              : 'No songs.'}
          </Text>
        }
        renderItem={({ item }) => (
          <SongRow song={item} onPress={() => playSong(item, list)} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, paddingTop: 12 },
  tabs: { flexDirection: 'row', gap: 18, paddingHorizontal: 16, marginBottom: 6 },
  tab: { paddingVertical: 6 },
  tabText: { color: colors.muted, fontSize: 18, fontWeight: '800' },
  tabActive: { color: colors.text },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40, paddingHorizontal: 24 },
});
