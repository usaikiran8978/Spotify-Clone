import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { usePreferences } from '../context/PreferencesContext';
import { colors } from '../theme';

export default function SettingsScreen({ onBack }) {
  const { language, setLanguage } = usePreferences();
  const [languages, setLanguages] = useState([]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    api.languages().then(setLanguages).catch(() => {});
  }, []);

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 12 }]}>
      <View style={styles.head}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.section}>Language preference</Text>
        <Text style={styles.hint}>
          Controls which language's latest songs and shelves you see on Home.
        </Text>

        <Row
          label="All languages"
          active={!language}
          onPress={() => setLanguage(null)}
        />
        {languages.map((l) => (
          <Row
            key={l.code}
            label={l.label}
            active={language === l.code}
            onPress={() => setLanguage(l.code)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function Row({ label, active, onPress }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Text style={styles.rowText}>{label}</Text>
      {active && <Ionicons name="checkmark" size={22} color={colors.green} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  section: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  hint: { color: colors.muted, fontSize: 13, marginBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surface3,
  },
  rowText: { color: colors.text, fontSize: 16 },
});
