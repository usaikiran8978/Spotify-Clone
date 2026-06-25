export const colors = {
  bg: '#000000',
  surface: '#121212',
  surface2: '#181818',
  surface3: '#282828',
  green: '#1DB954',
  text: '#FFFFFF',
  muted: '#B3B3B3',
  faint: '#7A7A7A',
};

export const spacing = (n) => n * 8;

// Rotating gradient-ish header colors used per category, Spotify style.
export const accentFor = (key = '') => {
  const palette = ['#E13300', '#1E3264', '#8400E7', '#148A08', '#E8115B',
    '#0D72EA', '#BC5900', '#509BF5', '#777777', '#AF2896'];
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
};
