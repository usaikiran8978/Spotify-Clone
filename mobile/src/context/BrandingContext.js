import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api';

// App branding fetched from the backend at launch, so it can be changed from
// the admin panel WITHOUT an app rebuild (in-app logo/name/accent — not the
// OS home-screen icon, which is baked into the build).
const DEFAULT = {
  appName: 'Melody',
  tagline: 'Play the music you love',
  logoUrl: '',
  accent: '#22C55E',
};

const BrandingContext = createContext(DEFAULT);

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(DEFAULT);

  useEffect(() => {
    api
      .branding()
      .then((b) => setBranding({ ...DEFAULT, ...b }))
      .catch(() => {}); // offline → keep defaults
  }, []);

  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>;
}

export const useBranding = () => useContext(BrandingContext);
