// Voice call inside a room — a WebRTC audio mesh.
//
// Topology: every participant connects directly to every other (peer-to-peer),
// which is ideal for the small groups a listening party tends to be. The
// backend only relays signaling (offers / answers / ICE candidates) over the
// same WebSocket the room already uses; audio never touches the server.
//
// Glare avoidance: the LATEST person to join the call initiates the offer to
// each existing participant, so every pair has exactly one initiator. Existing
// participants create their peer connection lazily when the offer arrives.
//
// Requires the native react-native-webrtc module (a dev/EAS build) — when it's
// unavailable we expose `callAvailable: false` and the UI degrades to a hint.
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useRoom } from './RoomContext';
import {
  webrtcAvailable,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
} from '../webrtc';

const CallContext = createContext(null);

const ICE = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

// Plain-object copies so signaling survives JSON round-tripping.
const descOf = (d) => ({ type: d.type, sdp: d.sdp });
const candOf = (c) => ({
  candidate: c.candidate,
  sdpMid: c.sdpMid,
  sdpMLineIndex: c.sdpMLineIndex,
});

export function CallProvider({ children }) {
  const { active, selfId, sendRaw, subscribe } = useRoom();

  const [inCall, setInCall] = useState(false);
  const [muted, setMuted] = useState(false);
  const [participants, setParticipants] = useState([]); // [{id,name}] in the call
  const [callError, setCallError] = useState('');

  const pcsRef = useRef(new Map()); // peerId -> RTCPeerConnection
  const localStreamRef = useRef(null);
  const inCallRef = useRef(false);
  const mutedRef = useRef(false);
  const selfIdRef = useRef(null);

  useEffect(() => {
    selfIdRef.current = selfId;
  }, [selfId]);

  // --- peer connection ------------------------------------------------------
  function createPeer(peerId, initiator) {
    if (pcsRef.current.has(peerId)) return pcsRef.current.get(peerId);
    const pc = new RTCPeerConnection(ICE);
    pcsRef.current.set(peerId, pc);

    const ls = localStreamRef.current;
    if (ls) ls.getTracks().forEach((t) => pc.addTrack(t, ls));

    pc.addEventListener('icecandidate', (e) => {
      if (e.candidate) {
        sendRaw({ type: 'call-signal', to: peerId, data: { candidate: candOf(e.candidate) } });
      }
    });
    // Remote audio is routed to the output automatically by react-native-webrtc;
    // we only need the connection to exist.
    pc.addEventListener('connectionstatechange', () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        closePeer(peerId);
      }
    });

    if (initiator) {
      (async () => {
        try {
          const offer = await pc.createOffer({});
          await pc.setLocalDescription(offer);
          sendRaw({ type: 'call-signal', to: peerId, data: { sdp: descOf(pc.localDescription) } });
        } catch {
          /* renegotiation will be retried if the peer re-announces */
        }
      })();
    }
    return pc;
  }

  function closePeer(peerId) {
    const pc = pcsRef.current.get(peerId);
    if (pc) {
      try {
        pc.close();
      } catch {
        /* already closed */
      }
      pcsRef.current.delete(peerId);
    }
  }

  async function handleSignal(from, data = {}) {
    let pc = pcsRef.current.get(from);
    if (data.sdp) {
      const desc = data.sdp;
      if (desc.type === 'offer') {
        if (!pc) pc = createPeer(from, false);
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(desc));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendRaw({ type: 'call-signal', to: from, data: { sdp: descOf(pc.localDescription) } });
        } catch {
          /* malformed offer — ignore */
        }
      } else if (desc.type === 'answer' && pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(desc));
        } catch {
          /* stale answer — ignore */
        }
      }
    } else if (data.candidate && pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch {
        /* candidate arrived before remote description — browser/native will retry */
      }
    }
  }

  // --- socket messages (forwarded from RoomContext) -------------------------
  function handleMessage(msg) {
    switch (msg.type) {
      case 'joined':
        setParticipants(msg.call || []);
        break;
      case 'call-state': {
        const list = msg.participants || [];
        setParticipants(list);
        if (inCallRef.current) {
          // Tear down connections to anyone who left the call.
          const ids = new Set(list.map((p) => p.id));
          for (const peerId of pcsRef.current.keys()) {
            if (!ids.has(peerId)) closePeer(peerId);
          }
        }
        break;
      }
      case 'call-ready':
        // We just joined: offer to everyone already in the call.
        if (!inCallRef.current) break;
        (msg.peers || []).forEach((p) => {
          if (p.id !== selfIdRef.current) createPeer(p.id, true);
        });
        break;
      case 'call-signal':
        if (inCallRef.current) handleSignal(msg.from, msg.data);
        break;
      default:
        break;
    }
  }

  // Subscribe once with a stable wrapper that always calls the latest handler.
  const handlerRef = useRef(null);
  handlerRef.current = handleMessage;
  useEffect(() => subscribe((m) => handlerRef.current?.(m)), [subscribe]);

  // Leaving the room (or it closing) ends any call.
  useEffect(() => {
    if (!active) {
      hangup();
      setParticipants([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // --- public actions -------------------------------------------------------
  function hangup() {
    pcsRef.current.forEach((pc) => {
      try {
        pc.close();
      } catch {
        /* already closed */
      }
    });
    pcsRef.current.clear();
    const ls = localStreamRef.current;
    if (ls) {
      ls.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          /* already stopped */
        }
      });
      localStreamRef.current = null;
    }
    inCallRef.current = false;
    setInCall(false);
    mutedRef.current = false;
    setMuted(false);
  }

  async function joinCall() {
    if (!webrtcAvailable) {
      setCallError('Voice call needs the latest app build (rebuild required).');
      return;
    }
    if (inCallRef.current) return;
    setCallError('');
    try {
      const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      mutedRef.current = false;
      setMuted(false);
      inCallRef.current = true;
      setInCall(true);
      sendRaw({ type: 'call-join' });
    } catch {
      inCallRef.current = false;
      setInCall(false);
      setCallError('Microphone permission is needed to join the call.');
    }
  }

  function leaveCall() {
    sendRaw({ type: 'call-leave' });
    hangup();
  }

  function toggleMute() {
    const ls = localStreamRef.current;
    if (!ls) return;
    const next = !mutedRef.current;
    ls.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
    mutedRef.current = next;
    setMuted(next);
  }

  return (
    <CallContext.Provider
      value={{
        callAvailable: webrtcAvailable,
        inCall,
        muted,
        callParticipants: participants,
        callCount: participants.length,
        callError,
        joinCall,
        leaveCall,
        toggleMute,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export const useCall = () => useContext(CallContext);
