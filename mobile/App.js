import { useState } from 'react';
import { Modal, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { PreferencesProvider, usePreferences } from './src/context/PreferencesContext';
import { BrandingProvider } from './src/context/BrandingContext';
import { DownloadsProvider } from './src/context/DownloadsContext';
import { PlaylistsProvider } from './src/context/PlaylistsContext';
import { PlayerProvider } from './src/context/PlayerContext';
import MiniPlayer from './src/components/MiniPlayer';
import UpdateGate from './src/components/UpdateGate';

import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import BrowseScreen from './src/screens/BrowseScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import CategoryScreen from './src/screens/CategoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import NowPlayingScreen from './src/screens/NowPlayingScreen';

import { colors } from './src/theme';

const TABS = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'search', label: 'Search', icon: 'search' },
  { key: 'browse', label: 'Browse', icon: 'albums' },
  { key: 'library', label: 'Library', icon: 'library' },
];

function Shell() {
  const [tab, setTab] = useState('home');
  const [category, setCategory] = useState(null); // drill-down overlay
  const [showSettings, setShowSettings] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);

  return (
    <View style={styles.app}>
      <View style={styles.body}>
        {tab === 'home' && <HomeScreen onOpenSettings={() => setShowSettings(true)} />}
        {tab === 'search' && <SearchScreen />}
        {tab === 'browse' && <BrowseScreen onOpenCategory={setCategory} />}
        {tab === 'library' && <LibraryScreen />}
      </View>

      <MiniPlayer onOpen={() => setShowPlayer(true)} />

      <View style={styles.tabbar}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable key={t.key} style={styles.tab} onPress={() => setTab(t.key)}>
              <Ionicons
                name={active ? t.icon : `${t.icon}-outline`}
                size={24}
                color={active ? colors.text : colors.faint}
              />
              <Text style={[styles.tabLabel, { color: active ? colors.text : colors.faint }]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Modal visible={!!category} animationType="slide" onRequestClose={() => setCategory(null)}>
        {category && <CategoryScreen category={category} onBack={() => setCategory(null)} />}
      </Modal>

      <Modal visible={showSettings} animationType="slide" onRequestClose={() => setShowSettings(false)}>
        <SettingsScreen onBack={() => setShowSettings(false)} />
      </Modal>

      <Modal visible={showPlayer} animationType="slide" onRequestClose={() => setShowPlayer(false)}>
        <NowPlayingScreen onClose={() => setShowPlayer(false)} />
      </Modal>
    </View>
  );
}

function Root() {
  const { onboarded, ready } = usePreferences();
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return onboarded ? <Shell /> : <OnboardingScreen />;
}

export default function App() {
  return (
    <PreferencesProvider>
      <BrandingProvider>
        <DownloadsProvider>
          <PlaylistsProvider>
          <PlayerProvider>
              <SafeAreaView style={styles.safe}>
                <StatusBar style="light" />
                <Root />
                <UpdateGate />
              </SafeAreaView>
            </PlayerProvider>
          </PlaylistsProvider>
        </DownloadsProvider>
      </BrandingProvider>
    </PreferencesProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  app: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  tabbar: {
    flexDirection: 'row',
    backgroundColor: '#0a0a0a',
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surface3,
  },
  tab: { flex: 1, alignItems: 'center' },
  tabLabel: { fontSize: 10, marginTop: 3 },
});
