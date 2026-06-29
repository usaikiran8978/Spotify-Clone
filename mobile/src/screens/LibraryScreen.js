import { useEffect, useState } from 'react';
import {
  Alert,
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
import { usePlayer } from '../context/PlayerContext';
import { useDownloads } from '../context/DownloadsContext';
import { usePlaylists } from '../context/PlaylistsContext';
import { colors } from '../theme';

// Library: All songs | Downloaded (offline) | Playlists.
export default function LibraryScreen() {
  const { playSong } = usePlayer();
  const { offlineList } = useDownloads();
  const { playlists, createPlaylist, deletePlaylist, removeFromPlaylist, moveSong } =
    usePlaylists();
  const [songs, setSongs] = useState([]);
  const [tab, setTab] = useState('all'); // 'all' | 'downloaded' | 'playlists'
  const [newName, setNewName] = useState('');
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    api.songs({ sort: 'latest' }).then(setSongs).catch(() => setSongs([]));
  }, []);

  const openPlaylist = playlists.find((p) => p.id === openId) || null;

  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const Tabs = (
    <View style={styles.tabs}>
      {[
        ['all', 'All songs'],
        ['downloaded', `Downloaded · ${offlineList.length}`],
        ['playlists', `Playlists · ${playlists.length}`],
      ].map(([key, label]) => (
        <Pressable
          key={key}
          onPress={() => {
            setTab(key);
            setOpenId(null);
          }}
        >
          <Text style={[styles.tabText, tab === key && styles.tabActive]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );

  // ---- Playlist detail ----
  if (tab === 'playlists' && openPlaylist) {
    return (
      <View style={styles.wrap}>
        <View style={styles.detailHead}>
          <Pressable onPress={() => setOpenId(null)} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
          <Text style={styles.detailTitle} numberOfLines={1}>
            {openPlaylist.name}
          </Text>
          <Pressable
            hitSlop={10}
            onPress={() =>
              Alert.alert('Delete playlist', `Delete "${openPlaylist.name}"?`, [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => {
                    deletePlaylist(openPlaylist.id);
                    setOpenId(null);
                  },
                },
              ])
            }
          >
            <Ionicons name="trash-outline" size={22} color={colors.faint} />
          </Pressable>
        </View>
        <FlatList
          data={openPlaylist.songs}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
          ListHeaderComponent={
            openPlaylist.songs.length > 0 ? (
              <View style={styles.playRow}>
                <Pressable
                  style={styles.playBtn}
                  onPress={() => playSong(openPlaylist.songs[0], openPlaylist.songs)}
                >
                  <Ionicons name="play" size={18} color="#000" />
                  <Text style={styles.playBtnText}>Play</Text>
                </Pressable>
                <Pressable
                  style={styles.shuffleBtn}
                  onPress={() => {
                    const s = shuffle(openPlaylist.songs);
                    playSong(s[0], s);
                  }}
                >
                  <Ionicons name="shuffle" size={18} color={colors.text} />
                  <Text style={styles.shuffleText}>Shuffle</Text>
                </Pressable>
              </View>
            ) : null
          }
          ListEmptyComponent={<Text style={styles.empty}>This playlist is empty.</Text>}
          renderItem={({ item, index }) => (
            <View style={styles.detailRow}>
              <View style={styles.reorder}>
                <Pressable
                  hitSlop={8}
                  disabled={index === 0}
                  onPress={() => moveSong(openPlaylist.id, index, index - 1)}
                >
                  <Ionicons
                    name="chevron-up"
                    size={18}
                    color={index === 0 ? colors.surface3 : colors.faint}
                  />
                </Pressable>
                <Pressable
                  hitSlop={8}
                  disabled={index === openPlaylist.songs.length - 1}
                  onPress={() => moveSong(openPlaylist.id, index, index + 1)}
                >
                  <Ionicons
                    name="chevron-down"
                    size={18}
                    color={
                      index === openPlaylist.songs.length - 1 ? colors.surface3 : colors.faint
                    }
                  />
                </Pressable>
              </View>
              <View style={{ flex: 1 }}>
                <SongRow song={item} onPress={() => playSong(item, openPlaylist.songs)} />
              </View>
              <Pressable
                hitSlop={10}
                onPress={() => removeFromPlaylist(openPlaylist.id, item.id)}
              >
                <Ionicons name="remove-circle-outline" size={22} color={colors.faint} />
              </Pressable>
            </View>
          )}
        />
      </View>
    );
  }

  // ---- Playlists list ----
  if (tab === 'playlists') {
    return (
      <View style={styles.wrap}>
        {Tabs}
        <View style={styles.createRow}>
          <TextInput
            style={styles.input}
            placeholder="New playlist name"
            placeholderTextColor={colors.faint}
            value={newName}
            onChangeText={setNewName}
            onSubmitEditing={() => {
              if (newName.trim()) {
                createPlaylist(newName);
                setNewName('');
              }
            }}
            returnKeyType="done"
          />
          <Pressable
            style={styles.createBtn}
            onPress={() => {
              if (newName.trim()) {
                createPlaylist(newName);
                setNewName('');
              }
            }}
          >
            <Ionicons name="add" size={22} color="#000" />
          </Pressable>
        </View>
        <FlatList
          data={playlists}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No playlists yet. Create one above, or tap ＋ on any song.
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.plRow} onPress={() => setOpenId(item.id)}>
              <Ionicons name="musical-notes" size={22} color={colors.muted} />
              <View style={{ flex: 1 }}>
                <Text style={styles.plName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.plSub}>{item.songs.length} songs</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.faint} />
            </Pressable>
          )}
        />
      </View>
    );
  }

  // ---- All / Downloaded ----
  const list = tab === 'downloaded' ? offlineList : songs;
  return (
    <View style={styles.wrap}>
      {Tabs}
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
  tabs: { flexDirection: 'row', gap: 16, paddingHorizontal: 16, marginBottom: 8, flexWrap: 'wrap' },
  tabText: { color: colors.muted, fontSize: 16, fontWeight: '800', paddingVertical: 6 },
  tabActive: { color: colors.text },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40, paddingHorizontal: 24 },
  createRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginBottom: 8 },
  input: {
    flex: 1,
    backgroundColor: colors.surface3,
    color: colors.text,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  createBtn: {
    backgroundColor: colors.green,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surface3,
  },
  plName: { color: colors.text, fontSize: 16, fontWeight: '600' },
  plSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  detailHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  detailTitle: { color: colors.text, fontSize: 22, fontWeight: '800', flex: 1 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reorder: { alignItems: 'center', justifyContent: 'center' },
  playRow: { flexDirection: 'row', gap: 12, marginBottom: 10, paddingHorizontal: 4 },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.green,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 24,
  },
  playBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },
  shuffleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface3,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 24,
  },
  shuffleText: { color: colors.text, fontWeight: '700', fontSize: 15 },
});
