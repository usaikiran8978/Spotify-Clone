import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import { colors, accentFor } from '../theme';

// Section order + labels for the category facet types.
const TYPE_ORDER = ['language', 'decade', 'festival', 'genre', 'mood', 'artist', 'movie'];
const TYPE_LABELS = {
  language: 'Languages',
  decade: 'Decades',
  festival: 'Festivals',
  genre: 'Genres',
  mood: 'Moods',
  artist: 'Singers',
  movie: 'Movies',
};

// Grid of category tiles — "all songs categorized" entry point, grouped into
// sections (Languages, Decades, Festivals, Genres, Moods, Singers, Movies).
export default function BrowseScreen({ onOpenCategory }) {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
  }, []);

  const sections = useMemo(() => {
    const byType = {};
    for (const c of categories) (byType[c.type || 'genre'] ||= []).push(c);
    const types = [
      ...TYPE_ORDER.filter((t) => byType[t]),
      ...Object.keys(byType).filter((t) => !TYPE_ORDER.includes(t)),
    ];
    return types.map((t) => ({
      type: t,
      label: TYPE_LABELS[t] || t,
      items: byType[t].sort(
        (a, b) => (b.count || 0) - (a.count || 0) || a.name.localeCompare(b.name),
      ),
    }));
  }, [categories]);

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
      <Text style={styles.h1}>Browse all</Text>
      {sections.map((section) => (
        <View key={section.type}>
          <Text style={styles.h2}>{section.label}</Text>
          <View style={styles.grid}>
            {section.items.map((c) => (
              <Pressable
                key={c.slug}
                style={[styles.tile, { backgroundColor: accentFor(c.slug) }]}
                onPress={() => onOpenCategory(c)}
              >
                <Text style={styles.tileText} numberOfLines={2}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  h1: { color: colors.text, fontSize: 24, fontWeight: '800', marginBottom: 16 },
  h2: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: {
    width: '48%',
    height: 100,
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    overflow: 'hidden',
  },
  tileText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
