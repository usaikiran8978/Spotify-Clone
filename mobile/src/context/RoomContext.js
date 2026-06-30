// "Listen Together" — synchronized playback rooms.
//
// One person hosts; everyone who joins follows. The host's device is the source
// of truth: it broadcasts its playback state (song / position / play-pause) to
// the backend, which relays it to members. Each member continuously reconciles
// its local player to the host so all devices play the same song at (very near)
// the same instant.
//
// Keeping "same time" honest: devices don't share a clock, so on connect we run
// a tiny NTP-style handshake (`time` ping/echo) to estimate this device's offset
// from server time. The host's broadcasts are stamped with server time, so a
// member can extrapolate the live position as it plays — not just the stale
// snapshot it received.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WS_URL } from '../config';
import { usePlayer } from './PlayerContext';

const RoomContext = createContext(null);
const NAME_KEY = '@spotifyclone/displayName';

const HEARTBEAT_MS = 2000; // host re-broadcasts state this often (also catches seeks)
const RECONCILE_MS = 1000; // member re-checks alignment this often
const DRIFT_TOLERANCE_MS = 1200; // only hard-seek a member when off by more than this
const END_GUARD_MS = 1500; // stop correcting this close to the end (let the host advance)

export function RoomProvider({ children }) {
  const player = usePlayer();
  // Keep the latest player snapshot in a ref so interval/socket callbacks read
  // current values instead of the stale values captured in their closure.
  const playerRef = useRef(player);
  playerRef.current = player;

  const [status, setStatus] = useState('idle'); // idle | connecting | connected | error
  const [room, setRoom] = useState(null); // { code, role, hostName, members, count, self }
  const [messages, setMessages] = useState([]); // room chat transcript
  const [error, setError] = useState('');
  const [savedName, setSavedName] = useState('');

  const wsRef = useRef(null);
  const offsetRef = useRef(0); // serverTime ≈ Date.now() + offset
  const bestRttRef = useRef(Infinity); // best (lowest) round-trip seen during clock sync
  const anchorRef = useRef(null); // last playback anchor received (member)
  const roleRef = useRef(null);
  const loadingRef = useRef(null); // song id currently being loaded (member)
  const listenersRef = useRef(new Set()); // extra subscribers to socket messages (call)

  useEffect(() => {
    AsyncStorage.getItem(NAME_KEY)
      .then((n) => n && setSavedName(n))
      .catch(() => {});
  }, []);

  const serverNow = () => Date.now() + offsetRef.current;

  // ---- clock sync: fire a handful of pings; keep the offset from the fastest
  // round-trip (least network jitter = most accurate). ------------------------
  function startClockSync(ws) {
    bestRttRef.current = Infinity;
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({ type: 'time', t0: Date.now() }));
        }
      }, i * 200);
    }
  }

  // ---- member: extrapolate where playback should be *right now* --------------
  function expectedPos(a) {
    const elapsed = a.isPlaying ? serverNow() - a.anchorTs : 0;
    return Math.max(0, a.positionMs + elapsed);
  }

  // ---- member: nudge the local player toward the host's anchor ---------------
  async function reconcile() {
    const a = anchorRef.current;
    if (!a || !a.song) return;
    const p = playerRef.current;

    // Wrong song (or nothing) loaded → load the host's song and seek into it.
    if (p.current?.id !== a.song.id) {
      if (loadingRef.current) return; // a load is already in flight — serialize
      loadingRef.current = a.song.id;
      try {
        await p.playSong(a.song, [a.song]);
        await p.seek(expectedPos(a));
        if (!a.isPlaying) await p.pause();
      } catch {
        /* stream hiccup — next reconcile retries */
      } finally {
        loadingRef.current = null;
      }
      return;
    }
    if (loadingRef.current) return; // still settling a load

    const dur = p.duration || (a.song.duration || 0) * 1000;
    if (a.isPlaying) {
      if (!p.isPlaying) p.play();
      const target = expectedPos(a);
      // Don't fight the natural end of the track — the host will broadcast the
      // next song as it advances.
      if (dur && target > dur - END_GUARD_MS) return;
      if (Math.abs(p.position - target) > DRIFT_TOLERANCE_MS) p.seek(target);
    } else {
      if (p.isPlaying) p.pause();
      if (Math.abs(p.position - a.positionMs) > DRIFT_TOLERANCE_MS) {
        p.seek(a.positionMs);
      }
    }
  }

  // ---- host: push our current playback to the room ---------------------------
  function broadcastState() {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== 1) return;
    const p = playerRef.current;
    const c = p.current;
    if (!c) return;
    ws.send(
      JSON.stringify({
        type: 'sync',
        song: {
          id: c.id,
          title: c.title,
          artist: c.artist,
          album: c.album,
          coverUrl: c.coverUrl,
          audioUrl: c.audioUrl,
          duration: c.duration,
          language: c.language,
        },
        positionMs: Math.round(p.position),
        isPlaying: p.isPlaying,
      }),
    );
  }

  // ---- socket lifecycle ------------------------------------------------------
  function teardown(message) {
    const ws = wsRef.current;
    if (ws) {
      ws.onclose = null;
      ws.onmessage = null;
      ws.onerror = null;
      try {
        ws.close();
      } catch {
        /* already closed */
      }
    }
    wsRef.current = null;
    roleRef.current = null;
    anchorRef.current = null;
    loadingRef.current = null;
    setRoom(null);
    setMessages([]);
    setStatus('idle');
    if (message) setError(message);
  }

  function onMessage(ev) {
    let msg;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      return;
    }
    switch (msg.type) {
      case 'time': {
        const t1 = Date.now();
        const rtt = t1 - msg.t0;
        if (rtt < bestRttRef.current) {
          bestRttRef.current = rtt;
          // Best estimate of server time at t1 is ts + half the round-trip.
          offsetRef.current = msg.ts + rtt / 2 - t1;
        }
        break;
      }
      case 'joined':
        roleRef.current = msg.role;
        anchorRef.current = msg.playback || null;
        setRoom({
          code: msg.code,
          role: msg.role,
          hostName: msg.hostName,
          members: msg.members,
          count: msg.count,
          self: msg.self,
        });
        setMessages(msg.chat || []);
        setStatus('connected');
        setError('');
        if (msg.role === 'member' && msg.playback) reconcile();
        break;
      case 'chat':
        setMessages((m) => {
          const next = [...m, msg];
          return next.length > 200 ? next.slice(-200) : next;
        });
        break;
      case 'members':
        setRoom((r) => (r ? { ...r, members: msg.members, count: msg.count } : r));
        break;
      case 'sync':
        anchorRef.current = {
          song: msg.song,
          positionMs: msg.positionMs,
          isPlaying: msg.isPlaying,
          anchorTs: msg.anchorTs,
        };
        if (roleRef.current === 'member') reconcile();
        break;
      case 'room-closed':
        teardown('The host ended the room.');
        break;
      case 'left':
        teardown('');
        break;
      case 'error':
        // Failed before we ever joined (e.g. bad code) → drop the connection.
        if (!roleRef.current) teardown(msg.error || 'Something went wrong');
        else setError(msg.error || 'Something went wrong');
        break;
      default:
        break;
    }
    // Fan the raw message out to extra subscribers (the voice-call layer reads
    // call-* messages off the same socket).
    listenersRef.current.forEach((fn) => {
      try {
        fn(msg);
      } catch {
        /* a subscriber threw — ignore */
      }
    });
  }

  // Stable helpers for the call layer: subscribe to messages and send raw frames
  // over the shared socket. Both read from refs, so they never change identity.
  const subscribe = useCallback((fn) => {
    listenersRef.current.add(fn);
    return () => listenersRef.current.delete(fn);
  }, []);
  const sendRaw = useCallback((obj) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
  }, []);

  function connect(initialMsg) {
    setError('');
    setStatus('connecting');
    bestRttRef.current = Infinity;
    let ws;
    try {
      ws = new WebSocket(WS_URL);
    } catch {
      setStatus('error');
      setError('Could not connect to the server.');
      return;
    }
    wsRef.current = ws;
    ws.onopen = () => {
      startClockSync(ws);
      ws.send(JSON.stringify(initialMsg));
    };
    ws.onmessage = onMessage;
    ws.onerror = () => {
      setError('Connection error. Is the backend reachable?');
    };
    ws.onclose = () => {
      if (wsRef.current !== ws) return; // superseded / already torn down
      wsRef.current = null;
      roleRef.current = null;
      anchorRef.current = null;
      setRoom(null);
      setStatus((s) => (s === 'connecting' ? 'error' : 'idle'));
    };
  }

  // ---- host heartbeat / member reconcile loops -------------------------------
  // Driven off room.role so the right loop starts when we (host or member) join
  // and stops when we leave.
  useEffect(() => {
    if (!room) return undefined;
    if (room.role === 'host') {
      broadcastState();
      const id = setInterval(broadcastState, HEARTBEAT_MS);
      return () => clearInterval(id);
    }
    if (room.role === 'member') {
      const id = setInterval(reconcile, RECONCILE_MS);
      return () => clearInterval(id);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.role, room?.code]);

  // Host: broadcast immediately on song change / play-pause so members react
  // without waiting for the next heartbeat.
  useEffect(() => {
    if (room?.role === 'host') broadcastState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.role, player.current?.id, player.isPlaying]);

  // ---- public API ------------------------------------------------------------
  async function rememberName(name) {
    const nm =
      String(name || savedName || 'Guest').trim().slice(0, 24) || 'Guest';
    setSavedName(nm);
    AsyncStorage.setItem(NAME_KEY, nm).catch(() => {});
    return nm;
  }

  async function createRoom(name) {
    const nm = await rememberName(name);
    connect({ type: 'create', name: nm });
  }

  async function joinRoom(code, name) {
    const nm = await rememberName(name);
    connect({ type: 'join', code: String(code).trim().toUpperCase(), name: nm });
  }

  function leaveRoom() {
    const ws = wsRef.current;
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'leave' }));
    teardown('');
  }

  function sendChat(text) {
    const body = String(text || '').trim();
    const ws = wsRef.current;
    if (!body || !ws || ws.readyState !== 1) return;
    ws.send(JSON.stringify({ type: 'chat', text: body }));
  }

  const isHost = room?.role === 'host';
  const isFollower = room?.role === 'member';

  return (
    <RoomContext.Provider
      value={{
        status,
        room,
        messages,
        error,
        savedName,
        isHost,
        isFollower,
        active: !!room,
        selfId: room?.self?.id ?? null,
        createRoom,
        joinRoom,
        leaveRoom,
        sendChat,
        subscribe,
        sendRaw,
        clearError: () => setError(''),
      }}
    >
      {children}
    </RoomContext.Provider>
  );
}

export const useRoom = () => useContext(RoomContext);
