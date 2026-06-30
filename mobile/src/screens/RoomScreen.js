import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoom } from '../context/RoomContext';
import { useCall } from '../context/CallContext';
import { colors } from '../theme';

const fmtTime = (ts) => {
  const d = new Date(ts);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
};

export default function RoomScreen({ onClose }) {
  const {
    status,
    room,
    messages,
    error,
    savedName,
    isHost,
    createRoom,
    joinRoom,
    leaveRoom,
    sendChat,
    clearError,
  } = useRoom();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    if (savedName) setName((n) => n || savedName);
  }, [savedName]);

  const connecting = status === 'connecting';

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 12 }]}>
      <View style={styles.topbar}>
        <Pressable onPress={onClose} hitSlop={12}>
          <Ionicons name="chevron-down" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>LISTEN TOGETHER</Text>
        <View style={{ width: 28 }} />
      </View>

      {room ? (
        <InRoom
          room={room}
          isHost={isHost}
          messages={messages}
          onSend={sendChat}
          onLeave={leaveRoom}
          bottomInset={insets.bottom}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Ionicons
            name="people-circle"
            size={64}
            color={colors.green}
            style={{ alignSelf: 'center', marginBottom: 12 }}
          />
          <Text style={styles.lead}>
            Start a room and everyone who joins hears the same song — and can chat
            — in sync.
          </Text>

          <Text style={styles.label}>Your name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Guest"
            placeholderTextColor={colors.faint}
            style={styles.input}
            maxLength={24}
          />

          <Pressable
            style={[styles.primaryBtn, connecting && { opacity: 0.6 }]}
            disabled={connecting}
            onPress={() => {
              clearError();
              createRoom(name);
            }}
          >
            <Ionicons name="add-circle" size={20} color="#000" />
            <Text style={styles.primaryText}>Create a room</Text>
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>or join with a code</Text>
            <View style={styles.line} />
          </View>

          <View style={styles.joinRow}>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              placeholder="CODE"
              placeholderTextColor={colors.faint}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={5}
              style={[styles.input, styles.codeInput]}
            />
            <Pressable
              style={[
                styles.joinBtn,
                (connecting || code.length < 4) && { opacity: 0.5 },
              ]}
              disabled={connecting || code.length < 4}
              onPress={() => {
                clearError();
                joinRoom(code, name);
              }}
            >
              <Text style={styles.joinText}>Join</Text>
            </Pressable>
          </View>

          {connecting && (
            <View style={styles.statusRow}>
              <ActivityIndicator color={colors.green} />
              <Text style={styles.statusText}>Connecting…</Text>
            </View>
          )}
          {!!error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>
      )}
    </View>
  );
}

function InRoom({ room, isHost, messages, onSend, onLeave, bottomInset }) {
  const {
    inCall,
    muted,
    callParticipants,
    callCount,
    callError,
    joinCall,
    leaveCall,
    toggleMute,
  } = useCall();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);
  const callIds = new Set(callParticipants.map((p) => p.id));

  const submit = () => {
    const t = draft.trim();
    if (!t) return;
    onSend(t);
    setDraft('');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      {/* Room info header */}
      <View style={styles.roomHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.roomHeaderLabel}>
            {isHost ? 'Room code' : `${room.hostName}'s room`}
          </Text>
          <View style={styles.roomHeaderCodeRow}>
            <Text style={styles.roomHeaderCode}>{room.code}</Text>
            <View style={styles.rolePill}>
              <Ionicons
                name={isHost ? 'star' : 'musical-notes'}
                size={11}
                color={colors.green}
              />
              <Text style={styles.rolePillText}>{isHost ? 'Host' : 'Listening'}</Text>
            </View>
          </View>
        </View>
        <Pressable style={styles.leaveBtn} onPress={onLeave} hitSlop={8}>
          <Ionicons name="exit-outline" size={18} color="#fff" />
          <Text style={styles.leaveText}>{isHost ? 'End' : 'Leave'}</Text>
        </Pressable>
      </View>

      {/* Roster strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.roster}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 14, alignItems: 'center' }}
      >
        <Text style={styles.rosterCount}>{room.count} here</Text>
        {room.members.map((m) => (
          <View key={m.id} style={styles.rosterItem}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(m.name || '?').slice(0, 1).toUpperCase()}
              </Text>
              {m.name === room.hostName && (
                <View style={styles.hostDot}>
                  <Ionicons name="star" size={9} color="#000" />
                </View>
              )}
              {callIds.has(m.id) && (
                <View style={styles.callDot}>
                  <Ionicons name="mic" size={9} color="#fff" />
                </View>
              )}
            </View>
            <Text style={styles.rosterName} numberOfLines={1}>
              {m.id === room.self?.id ? 'You' : m.name}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Voice call bar */}
      <View style={styles.callBar}>
        <View style={[styles.callIcon, inCall && styles.callIconActive]}>
          <Ionicons name="call" size={16} color={inCall ? '#000' : colors.green} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.callTitle}>Voice call</Text>
          <Text style={styles.callSub} numberOfLines={1}>
            {callCount > 0
              ? `${callCount} in call${
                  inCall ? '' : ' · tap join to talk'
                }`
              : 'No one in the call yet'}
          </Text>
        </View>
        {inCall ? (
          <View style={styles.callActions}>
            <Pressable
              onPress={toggleMute}
              style={[styles.micBtn, muted && styles.micBtnMuted]}
              hitSlop={8}
            >
              <Ionicons name={muted ? 'mic-off' : 'mic'} size={18} color="#fff" />
            </Pressable>
            <Pressable onPress={leaveCall} style={styles.endCallBtn} hitSlop={8}>
              <Ionicons name="call" size={16} color="#fff" />
              <Text style={styles.endCallText}>Leave</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={joinCall} style={styles.joinCallBtn}>
            <Text style={styles.joinCallText}>Join</Text>
          </Pressable>
        )}
      </View>
      {!!callError && <Text style={styles.callError}>{callError}</Text>}

      {/* Chat transcript */}
      <ScrollView
        ref={scrollRef}
        style={styles.chat}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 ? (
          <Text style={styles.emptyChat}>No messages yet — say hi 👋</Text>
        ) : (
          messages.map((msg) => {
            const own = msg.from === room.self?.id;
            return (
              <View
                key={msg.id}
                style={[styles.bubbleRow, own ? styles.bubbleRowOwn : styles.bubbleRowOther]}
              >
                <View style={[styles.bubble, own ? styles.bubbleOwn : styles.bubbleOther]}>
                  {!own && <Text style={styles.bubbleName}>{msg.name}</Text>}
                  <Text style={[styles.bubbleText, own && { color: '#000' }]}>
                    {msg.text}
                  </Text>
                  <Text style={[styles.bubbleTime, own && { color: 'rgba(0,0,0,0.5)' }]}>
                    {fmtTime(msg.ts)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Composer */}
      <View style={[styles.composer, { paddingBottom: (bottomInset || 0) + 8 }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Message the room…"
          placeholderTextColor={colors.faint}
          style={styles.composerInput}
          maxLength={500}
          multiline
          onSubmitEditing={submit}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <Pressable
          style={[styles.sendBtn, !draft.trim() && { opacity: 0.4 }]}
          onPress={submit}
          disabled={!draft.trim()}
        >
          <Ionicons name="send" size={18} color="#000" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  topTitle: { color: colors.text, fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  // Create / join form
  lead: {
    color: colors.muted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
  label: { color: colors.faint, fontSize: 12, marginBottom: 8, fontWeight: '600' },
  input: {
    backgroundColor: colors.surface3,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.green,
    borderRadius: 999,
    paddingVertical: 16,
    marginTop: 24,
  },
  primaryText: { color: '#000', fontSize: 16, fontWeight: '800' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 28 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.surface3 },
  dividerText: { color: colors.faint, fontSize: 12 },
  joinRow: { flexDirection: 'row', gap: 10 },
  codeInput: {
    flex: 1,
    letterSpacing: 6,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  joinBtn: {
    backgroundColor: colors.surface3,
    borderRadius: 10,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 28,
  },
  statusText: { color: colors.muted, fontSize: 14 },
  error: { color: '#ff6b6b', textAlign: 'center', marginTop: 20, fontSize: 14 },

  // In-room header
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  roomHeaderLabel: { color: colors.faint, fontSize: 12, fontWeight: '600' },
  roomHeaderCodeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  roomHeaderCode: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 4,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(29,185,84,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  rolePillText: { color: colors.green, fontSize: 11, fontWeight: '700' },
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface3,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  leaveText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Roster
  roster: {
    flexGrow: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surface3,
    paddingVertical: 10,
  },
  rosterCount: { color: colors.faint, fontSize: 12, fontWeight: '600' },
  rosterItem: { alignItems: 'center', width: 52 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  hostDot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  rosterName: { color: colors.muted, fontSize: 11, marginTop: 4 },
  callDot: {
    position: 'absolute',
    left: -2,
    bottom: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#0D72EA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },

  // Voice call bar
  callBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: colors.surface2,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  callIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(29,185,84,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callIconActive: { backgroundColor: colors.green },
  callTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  callSub: { color: colors.muted, fontSize: 12, marginTop: 1 },
  callActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  micBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnMuted: { backgroundColor: '#E8115B' },
  endCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E8115B',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  endCallText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  joinCallBtn: {
    backgroundColor: colors.green,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 9,
  },
  joinCallText: { color: '#000', fontSize: 14, fontWeight: '800' },
  callError: {
    color: '#ff6b6b',
    fontSize: 12,
    marginHorizontal: 16,
    marginTop: 6,
  },

  // Chat
  chat: { flex: 1 },
  emptyChat: { color: colors.faint, textAlign: 'center', marginTop: 40, fontSize: 14 },
  bubbleRow: { marginBottom: 10, flexDirection: 'row' },
  bubbleRowOwn: { justifyContent: 'flex-end' },
  bubbleRowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleOwn: { backgroundColor: colors.green, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.surface3, borderBottomLeftRadius: 4 },
  bubbleName: { color: colors.green, fontSize: 12, fontWeight: '700', marginBottom: 2 },
  bubbleText: { color: colors.text, fontSize: 15, lineHeight: 20 },
  bubbleTime: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    marginTop: 3,
    alignSelf: 'flex-end',
  },

  // Composer
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surface3,
  },
  composerInput: {
    flex: 1,
    backgroundColor: colors.surface3,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    color: colors.text,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
