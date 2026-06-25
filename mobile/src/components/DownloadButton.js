import { ActivityIndicator, Alert, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useDownloads } from '../context/DownloadsContext';

// Tap to choose: save offline (in-app, plays offline) or save to device storage.
// When already offline, offers save-to-device or remove.
export default function DownloadButton({ song, size = 18, color = colors.faint }) {
  const {
    isOffline,
    isBusy,
    downloadOffline,
    downloadToDevice,
    removeOffline,
  } = useDownloads();

  const offline = isOffline(song.id);
  const busy = isBusy(song.id);

  const run = (fn, okMsg) =>
    fn(song)
      .then(() => okMsg && Alert.alert('Done', okMsg))
      .catch((e) => Alert.alert('Failed', e.message || 'Something went wrong'));

  function onPress() {
    if (busy) return;
    if (offline) {
      Alert.alert(song.title, 'Saved offline in the app.', [
        { text: 'Save to device', onPress: () => run(downloadToDevice, 'Saved to device storage.') },
        { text: 'Remove download', style: 'destructive', onPress: () => run(removeOffline) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      Alert.alert('Download', song.title, [
        {
          text: 'Save offline (play in app)',
          onPress: () => run(downloadOffline, 'Saved for offline playback.'),
        },
        {
          text: 'Save to device storage',
          onPress: () => run(downloadToDevice, 'Saved to device storage.'),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

  if (busy) return <ActivityIndicator size="small" color={colors.green} />;

  return (
    <Pressable onPress={onPress} hitSlop={10}>
      <Ionicons
        name={offline ? 'arrow-down-circle' : 'arrow-down-circle-outline'}
        size={size}
        color={offline ? colors.green : color}
      />
    </Pressable>
  );
}
