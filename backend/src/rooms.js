// Real-time "Listen Together" rooms over WebSockets.
//
// Rooms are EPHEMERAL and in-memory: a room exists only while people are in it
// (nothing is persisted to the store). The host controls playback; the server
// relays the host's playback state to every member, stamping each update with
// server time so members can extrapolate the exact current position and play
// the same song at the same moment — even with clock skew between devices.
import { WebSocketServer } from 'ws';
import { customAlphabet } from 'nanoid';

// Room codes: 5 uppercase chars with ambiguous glyphs (0/O/1/I) removed, so
// they're easy to read out loud and type.
const makeCode = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 5);

const rooms = new Map(); // code -> Room
let nextClientId = 1;
let nextMsgId = 1;

const CHAT_HISTORY = 50; // recent messages kept so late joiners see context

const now = () => Date.now();

const publicMembers = (room) =>
  [...room.clients.values()].map((c) => ({ id: c.id, name: c.name }));

// Who is currently in the room's voice call.
const callParticipants = (room) =>
  [...room.call].map((id) => ({ id, name: room.clients.get(id)?.name || '?' }));

function send(ws, type, payload) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type, ...payload }));
}

function broadcast(room, type, payload, exceptId) {
  for (const c of room.clients.values()) {
    if (exceptId && c.id === exceptId) continue;
    send(c.ws, type, payload);
  }
}

// Roster + current playback for a freshly-joined client.
function roomState(room) {
  return {
    code: room.code,
    hostName: room.clients.get(room.hostId)?.name || 'Host',
    members: publicMembers(room),
    count: room.clients.size,
    playback: room.playback,
    chat: room.chat,
    call: callParticipants(room),
  };
}

function leaveRoom(client) {
  const room = client.room;
  if (!room) return;
  client.room = null;
  const wasInCall = room.call.delete(client.id);
  room.clients.delete(client.id);

  if (room.clients.size === 0) {
    rooms.delete(room.code);
    return;
  }
  if (room.hostId === client.id) {
    // Host left → close the party for everyone left behind.
    broadcast(room, 'room-closed', { reason: 'host-left' });
    for (const c of room.clients.values()) c.room = null;
    rooms.delete(room.code);
    return;
  }
  // A member left → refresh the roster (and the call roster if they were in it).
  broadcast(room, 'members', {
    members: publicMembers(room),
    count: room.clients.size,
  });
  if (wasInCall) {
    broadcast(room, 'call-state', { participants: callParticipants(room) });
  }
}

function handle(client, msg) {
  switch (msg.type) {
    // Clock-sync echo: the client measures the round-trip and reads `ts` to
    // estimate the offset between its clock and the server's.
    case 'time':
      send(client.ws, 'time', { t0: msg.t0, ts: now() });
      break;

    case 'create': {
      if (client.room) leaveRoom(client);
      client.name = String(msg.name || 'Host').slice(0, 24) || 'Host';
      let code = makeCode();
      while (rooms.has(code)) code = makeCode();
      const room = {
        code,
        hostId: client.id,
        clients: new Map(),
        playback: null,
        chat: [],
        call: new Set(), // client ids currently in the voice call
        createdAt: now(),
      };
      room.clients.set(client.id, client);
      client.room = room;
      rooms.set(code, room);
      send(client.ws, 'joined', {
        role: 'host',
        self: { id: client.id, name: client.name },
        ...roomState(room),
      });
      break;
    }

    case 'join': {
      const code = String(msg.code || '').trim().toUpperCase();
      const room = rooms.get(code);
      if (!room) {
        send(client.ws, 'error', { error: 'Room not found' });
        return;
      }
      if (client.room) leaveRoom(client);
      client.name = String(msg.name || 'Guest').slice(0, 24) || 'Guest';
      room.clients.set(client.id, client);
      client.room = room;
      send(client.ws, 'joined', {
        role: 'member',
        self: { id: client.id, name: client.name },
        ...roomState(room),
      });
      broadcast(
        room,
        'members',
        { members: publicMembers(room), count: room.clients.size },
        client.id,
      );
      break;
    }

    // Only the host drives playback. The server stamps the update with its own
    // clock (`anchorTs`) so members can extrapolate the live position.
    case 'sync': {
      const room = client.room;
      if (!room || room.hostId !== client.id) return;
      room.playback = {
        song: msg.song || null,
        positionMs: Number(msg.positionMs) || 0,
        isPlaying: !!msg.isPlaying,
        anchorTs: now(),
      };
      broadcast(room, 'sync', room.playback, client.id);
      break;
    }

    // Room chat. Echoed to everyone (incl. the sender) so all devices share one
    // ordered transcript. Recent messages are kept for late joiners.
    case 'chat': {
      const room = client.room;
      if (!room) return;
      const text = String(msg.text || '').trim().slice(0, 500);
      if (!text) return;
      const entry = {
        id: nextMsgId++,
        from: client.id,
        name: client.name,
        text,
        ts: now(),
      };
      room.chat.push(entry);
      if (room.chat.length > CHAT_HISTORY) room.chat.shift();
      broadcast(room, 'chat', entry);
      break;
    }

    // --- Voice call (WebRTC) signaling --------------------------------------
    // The server is just a relay: it tracks who's in the call and forwards
    // offers/answers/ICE candidates between specific peers. Media is P2P.
    case 'call-join': {
      const room = client.room;
      if (!room) return;
      room.call.add(client.id);
      // Tell the joiner who's already in the call — the NEW joiner initiates
      // the WebRTC offer to each existing peer (so every pair has exactly one
      // initiator and there's no offer glare).
      const peers = [...room.call]
        .filter((id) => id !== client.id)
        .map((id) => ({ id, name: room.clients.get(id)?.name || '?' }));
      send(client.ws, 'call-ready', { peers });
      broadcast(room, 'call-state', { participants: callParticipants(room) });
      break;
    }

    case 'call-leave': {
      const room = client.room;
      if (!room) return;
      if (room.call.delete(client.id)) {
        broadcast(room, 'call-state', { participants: callParticipants(room) });
      }
      break;
    }

    // Relay an SDP offer/answer or ICE candidate to one specific peer.
    case 'call-signal': {
      const room = client.room;
      if (!room) return;
      const target = room.clients.get(msg.to);
      if (target && room.call.has(msg.to)) {
        send(target.ws, 'call-signal', { from: client.id, data: msg.data });
      }
      break;
    }

    case 'leave':
      leaveRoom(client);
      send(client.ws, 'left', {});
      break;

    default:
      break;
  }
}

export function attachRoomServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    const client = { id: nextClientId++, name: 'Guest', ws, room: null };
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      handle(client, msg);
    });
    ws.on('close', () => leaveRoom(client));
    ws.on('error', () => {});
  });

  // Drop dead connections (and tidy up their rooms) every 30s.
  const sweep = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      try {
        ws.ping();
      } catch {
        /* socket already gone */
      }
    }
  }, 30000);
  wss.on('close', () => clearInterval(sweep));

  return wss;
}
