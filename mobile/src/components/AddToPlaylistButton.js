import { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { usePlaylists } from '../context/PlaylistsContext';

// Tap → modal to add the song to an existing playlist or create a new one.
export default function AddToPlaylistButton({ song, size = 18, color = colors.faint }) {
  const { playlists, createPlaylist, addToPlaylist, isInPlaylist } = usePlaylists();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  function addTo(playlist) {
    const added = addToPlaylist(playlist.id, song);
    setOpen(false);
    Alert.alert(added ? 'Added' : 'Already added', `"${song.title}" · ${playlist.name}`);
  }

  function createAndAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const playlist = createPlaylist(trimmed);
    addToPlaylist(playlist.id, song);
    setName('');
    setOpen(false);
    Alert.alert('Added', `"${song.title}" · ${playlist.name}`);
  }

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={10}>
        <Ionicons name="add-circle-outline" size={size} color={color} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Add to playlist</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <Text style={styles.songName} numberOfLines={1}>
            {song.title}
          </Text>

          <View style={styles.createRow}>
            <TextInput
              style={styles.input}
              placeholder="New playlist name"
              placeholderTextColor={colors.faint}
              value={name}
              onChangeText={setName}
              onSubmitEditing={createAndAdd}
              returnKeyType="done"
            />
            <Pressable style={styles.createBtn} onPress={createAndAdd}>
              <Ionicons name="add" size={22} color="#000" />
            </Pressable>
          </View>

          <FlatList
            data={playlists}
            keyExtractor={(p) => p.id}
            style={{ maxHeight: 320 }}
            ListEmptyComponent={
              <Text style={styles.empty}>No playlists yet. Create one above.</Text>
            }
            renderItem={({ item }) => {
              const inIt = isInPlaylist(item.id, song.id);
              return (
                <Pressable style={styles.plRow} onPress={() => addTo(item)}>
                  <Ionicons
                    name={inIt ? 'checkmark-circle' : 'musical-notes'}
                    size={20}
                    color={inIt ? colors.green : colors.muted}
                  />
                  <Text style={styles.plName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.plCount}>{item.songs.length}</Text>
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: colors.surface2,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 28,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  songName: { color: colors.muted, fontSize: 13, marginTop: 4, marginBottom: 14 },
  createRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
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
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 20 },
  plRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surface3,
  },
  plName: { color: colors.text, fontSize: 15, fontWeight: '500', flex: 1 },
  plCount: { color: colors.faint, fontSize: 13 },
});
