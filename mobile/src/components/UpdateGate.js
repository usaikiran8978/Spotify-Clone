import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { api } from '../api';
import { colors } from '../theme';

// Compare dotted versions: returns true if `remote` is newer than `current`.
function isNewer(remote, current) {
  const a = String(remote).split('.').map((n) => parseInt(n, 10) || 0);
  const b = String(current).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] || 0) > (b[i] || 0)) return true;
    if ((a[i] || 0) < (b[i] || 0)) return false;
  }
  return false;
}

const currentVersion = Constants.expoConfig?.version || '1.0.0';

// Checks the backend for a newer Android build on launch and, when found,
// downloads the APK and hands it to the system installer.
export default function UpdateGate() {
  const [release, setRelease] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (Platform.OS !== 'android') return; // iOS can't sideload — App Store only
    api
      .release()
      .then((r) => {
        if (r?.apkUrl && isNewer(r.version, currentVersion)) setRelease(r);
      })
      .catch(() => {});
  }, []);

  if (!release) return null;

  async function update() {
    setBusy(true);
    setError('');
    try {
      const target = `${FileSystem.cacheDirectory}melody-${release.version}.apk`;
      await FileSystem.deleteAsync(target, { idempotent: true }).catch(() => {});
      const dl = FileSystem.createDownloadResumable(release.apkUrl, target, {}, (p) => {
        if (p.totalBytesExpectedToWrite > 0)
          setProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite);
      });
      const res = await dl.downloadAsync();
      if (!res?.uri) throw new Error('Download failed');
      const contentUri = await FileSystem.getContentUriAsync(res.uri);
      // ACTION_VIEW with the APK mime hands off to the system package installer
      // (works on modern Android; INSTALL_PACKAGE is deprecated).
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        type: 'application/vnd.android.package-archive',
      });
      // The system installer takes over from here.
    } catch (e) {
      setError(e.message || 'Update failed');
      setBusy(false);
    }
  }

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Update available</Text>
          <Text style={styles.version}>
            Version {release.version} · you have {currentVersion}
          </Text>
          {!!release.notes && <Text style={styles.notes}>{release.notes}</Text>}

          {busy ? (
            <View style={styles.progressWrap}>
              <ActivityIndicator color={colors.green} />
              <Text style={styles.progressText}>
                Downloading… {Math.round(progress * 100)}%
              </Text>
            </View>
          ) : (
            <Pressable style={styles.btn} onPress={update}>
              <Text style={styles.btnText}>Update now</Text>
            </Pressable>
          )}
          {!!error && <Text style={styles.error}>{error}</Text>}

          {!busy && (
            <Pressable onPress={() => setRelease(null)} hitSlop={8}>
              <Text style={styles.later}>Later</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: { backgroundColor: colors.surface2, borderRadius: 14, padding: 22, width: '100%' },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  version: { color: colors.muted, fontSize: 13, marginTop: 4 },
  notes: { color: colors.text, fontSize: 14, marginTop: 12, lineHeight: 20 },
  btn: {
    backgroundColor: colors.green,
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  btnText: { color: '#000', fontWeight: '800', fontSize: 15 },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
  progressText: { color: colors.text, fontSize: 14 },
  error: { color: '#f0726f', fontSize: 13, marginTop: 12 },
  later: { color: colors.muted, fontSize: 14, textAlign: 'center', marginTop: 14 },
});
