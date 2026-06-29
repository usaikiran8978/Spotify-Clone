// Melody mark — green-gradient ring (open at bottom-left) with an equalizer
// and a play triangle. Pure SVG so it scales crisply in the web admin.
export default function MelodyLogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="melGrad" x1="20" y1="10" x2="80" y2="90" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A8E063" />
          <stop offset="1" stopColor="#16A34A" />
        </linearGradient>
      </defs>
      {/* open ring */}
      <path
        d="M50 12 A38 38 0 1 1 24 78"
        stroke="url(#melGrad)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      {/* equalizer bars */}
      <rect x="33" y="44" width="6.5" height="14" rx="3.25" fill="url(#melGrad)" />
      <rect x="44" y="36" width="6.5" height="30" rx="3.25" fill="url(#melGrad)" />
      <rect x="55" y="40" width="6.5" height="22" rx="3.25" fill="url(#melGrad)" />
      {/* play triangle */}
      <path
        d="M64 38 C70 41 74 47 74 50 C74 56 66 62 60 64 C61 56 61 46 64 38 Z"
        fill="url(#melGrad)"
      />
    </svg>
  );
}
