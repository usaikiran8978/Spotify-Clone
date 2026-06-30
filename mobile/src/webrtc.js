// Thin, guarded wrapper around react-native-webrtc.
//
// react-native-webrtc is a NATIVE module: it only works in a custom dev build /
// EAS build, not in Expo Go, and not until the project is rebuilt after adding
// it. Importing it where the native side is missing would crash the whole app,
// so we require it defensively and expose `webrtcAvailable`. The voice-call UI
// checks that flag and degrades gracefully (shows a hint) when it's false.
let mod = null;
try {
  // eslint-disable-next-line global-require
  mod = require('react-native-webrtc');
} catch {
  mod = null;
}

export const webrtcAvailable = !!(mod && mod.RTCPeerConnection && mod.mediaDevices);

export const RTCPeerConnection = mod?.RTCPeerConnection;
export const RTCSessionDescription = mod?.RTCSessionDescription;
export const RTCIceCandidate = mod?.RTCIceCandidate;
export const mediaDevices = mod?.mediaDevices;
