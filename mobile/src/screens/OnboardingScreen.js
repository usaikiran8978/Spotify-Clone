import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import { usePreferences } from '../context/PreferencesContext';
import { colors, accentFor } from '../theme';

export default function OnboardingScreen() {
  const { setLanguage } = usePreferences();
  const [languages, setLanguages] = useState([]);

  useEffect(() => {
    api.languages().then(setLanguages).catch(() => {});
  }, []);

  return (
    <View style={styles.wrap}>
      <Text style={styles.logo}>● Spotify Clone</Text>
      <Text style={styles.h1}>What do you want to listen to?</Text>
      <Text style={styles.sub}>Pick your preferred language. You can change it anytime.</Text>

      <View style={styles.grid}>
        {languages.map((l) => (
          <Pressable
            key={l.code}
            style={[styles.tile, { backgroundColor: accentFor(l.code) }]}
            onPress={() => setLanguage(l.code)}
          >
            <Text style={styles.tileText}>{l.label}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.skip} onPress={() => setLanguage(null)}>
        <Text style={styles.skipText}>Skip — show all languages</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, padding: 24, paddingTop: 80 },
  logo: { color: colors.green, fontSize: 18, fontWeight: '800', marginBottom: 40 },
  h1: { color: colors.text, fontSize: 28, fontWeight: '800' },
  sub: { color: colors.muted, fontSize: 14, marginTop: 8, marginBottom: 28 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: '47%',
    height: 90,
    borderRadius: 10,
    padding: 14,
    justifyContent: 'flex-end',
  },
  tileText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  skip: { marginTop: 36, alignItems: 'center' },
  skipText: { color: colors.muted, fontSize: 14, textDecorationLine: 'underline' },
});
