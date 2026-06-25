import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Shelf from '../components/Shelf';
import { api } from '../api';
import { usePreferences } from '../context/PreferencesContext';
import { colors } from '../theme';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

export default function HomeScreen({ onOpenSettings }) {
  const { language, setLanguage } = usePreferences();
  const [data, setData] = useState(null);
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [home, langs] = await Promise.all([api.home(language), api.languages()]);
      setData(home);
      setLanguages(langs);
    } catch (e) {
      setError('Could not reach the API. Is the backend running?');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [language]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={colors.green}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>{greeting()}</Text>
        <Pressable onPress={onOpenSettings}>
          <Text style={styles.gear}>⚙︎</Text>
        </Pressable>
      </View>

      {/* Quick language switch chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chips}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        <Chip label="All" active={!language} onPress={() => setLanguage(null)} />
        {languages.map((l) => (
          <Chip
            key={l.code}
            label={l.label}
            active={language === l.code}
            onPress={() => setLanguage(l.code)}
          />
        ))}
      </ScrollView>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <>
          <Shelf title="Latest releases" songs={data?.latest} />
          {data?.shelves?.map((shelf) => (
            <Shelf key={shelf.slug} title={shelf.name} songs={shelf.songs} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

function Chip({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && { backgroundColor: colors.green }]}
    >
      <Text style={[styles.chipText, active && { color: '#000', fontWeight: '700' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  greeting: { color: colors.text, fontSize: 24, fontWeight: '800' },
  gear: { color: colors.text, fontSize: 22 },
  chips: { marginBottom: 16, flexGrow: 0 },
  chip: {
    backgroundColor: colors.surface3,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chipText: { color: colors.text, fontSize: 13 },
  error: { color: colors.muted, textAlign: 'center', marginTop: 40, paddingHorizontal: 24 },
});
