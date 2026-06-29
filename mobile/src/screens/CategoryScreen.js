import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SongRow from '../components/SongRow';
import { api } from '../api';
import { usePreferences } from '../context/PreferencesContext';
import { usePlayer } from '../context/PlayerContext';
import { colors, accentFor } from '../theme';

export default function CategoryScreen({ category, onBack }) {
  const { language } = usePreferences();
  const { playSong } = usePlayer();
  const insets = useSafeAreaInsets();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .songs({ category: category.slug, language })
      .then(setSongs)
      .catch(() => setSongs([]))
      .finally(() => setLoading(false));
  }, [category.slug, language]);

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.hero,
          { backgroundColor: accentFor(category.slug), paddingTop: insets.top + 16 },
        ]}
      >
        <Pressable
          onPress={onBack}
          hitSlop={12}
          style={[styles.back, { top: insets.top + 12 }]}
        >
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </Pressable>
        <Text style={styles.heroTitle}>{category.name}</Text>
        <Text style={styles.heroSub}>{songs.length} songs</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.green} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
          ListHeaderComponent={
            songs.length ? (
              <Pressable style={styles.playAll} onPress={() => playSong(songs[0], songs)}>
                <Ionicons name="play" size={20} color="#000" />
                <Text style={styles.playAllText}>Play all</Text>
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => (
            <SongRow song={item} onPress={() => playSong(item, songs)} />
          )}
          ListEmptyComponent={<Text style={styles.empty}>No songs in this category yet.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  hero: { paddingTop: 56, paddingBottom: 24, paddingHorizontal: 16 },
  back: { position: 'absolute', top: 52, left: 12 },
  heroTitle: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 20 },
  heroSub: { color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  playAll: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.green,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
    marginBottom: 10,
  },
  playAllText: { color: '#000', fontWeight: '800', marginLeft: 6 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40 },
});
