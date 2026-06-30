import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useRoom } from '../context/RoomContext';

// Slim always-visible strip while a "Listen Together" room is active. Tapping
// it opens the room screen (roster / code / leave).
export default function RoomBanner({ onOpen }) {
  const { room, isHost } = useRoom();
  if (!room) return null;
  return (
    <Pressable style={styles.bar} onPress={onOpen}>
      <Ionicons name="radio" size={16} color={colors.green} />
      <Text style={styles.text} numberOfLines={1}>
        {isHost
          ? `Hosting · ${room.code}`
          : `Listening with ${room.hostName}`}
      </Text>
      <View style={styles.count}>
        <Ionicons name="people" size={13} color={colors.muted} />
        <Text style={styles.countText}>{room.count}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(29,185,84,0.12)',
    marginHorizontal: 8,
    marginBottom: 6,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  text: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '600' },
  count: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  countText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
});
