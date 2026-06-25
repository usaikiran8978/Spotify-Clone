import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import { colors, accentFor } from '../theme';

// Grid of category tiles — "all songs categorized" entry point.
export default function BrowseScreen({ onOpenCategory }) {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
  }, []);

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
      <Text style={styles.h1}>Browse all</Text>
      <View style={styles.grid}>
        {categories.map((c) => (
          <Pressable
            key={c.slug}
            style={[styles.tile, { backgroundColor: accentFor(c.slug) }]}
            onPress={() => onOpenCategory(c)}
          >
            <Text style={styles.tileText}>{c.name}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  h1: { color: colors.text, fontSize: 24, fontWeight: '800', marginBottom: 16 },
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
