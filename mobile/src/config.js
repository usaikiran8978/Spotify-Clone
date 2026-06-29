import { Platform } from 'react-native';

// Production / shared builds (the Android APK, tunnels, etc.) set the API URL
// at build time via the EXPO_PUBLIC_API_URL env var — see mobile/eas.json and
// mobile/.env.example. When it's absent we fall back to local-dev defaults.
const ENV_URL = process.env.EXPO_PUBLIC_API_URL;

// For running on a physical phone over your LAN without a deployed backend,
// set this to your computer's IP (`ipconfig getifaddr en0`).
const LAN_IP = '192.168.1.20';

const localDefault =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:4000' // Android emulator → host loopback
    : 'http://localhost:4000'; // iOS simulator / web

export const API_URL = ENV_URL || localDefault;
export { LAN_IP };

// JioSaavn API base URL for FULL-LENGTH songs (self-hosted instance of
// sumitkolhe/jiosaavn-api). Set EXPO_PUBLIC_SAAVN_URL after deploying it, e.g.
// "https://your-saavn-api.onrender.com". When unset, search falls back to
// iTunes 30-second previews.
export const SAAVN_URL = (process.env.EXPO_PUBLIC_SAAVN_URL || '').replace(/\/$/, '');
