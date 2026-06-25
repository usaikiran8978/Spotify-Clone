import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANG_KEY = '@spotifyclone/language';
const ONBOARD_KEY = '@spotifyclone/onboarded';
const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
  const [language, setLanguageState] = useState(null); // null = all languages
  const [onboarded, setOnboarded] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(LANG_KEY), AsyncStorage.getItem(ONBOARD_KEY)])
      .then(([lang, ob]) => {
        setLanguageState(lang || null);
        setOnboarded(ob === '1');
      })
      .finally(() => setReady(true));
  }, []);

  // Setting a language also completes onboarding.
  const setLanguage = async (code) => {
    setLanguageState(code);
    setOnboarded(true);
    await AsyncStorage.setItem(ONBOARD_KEY, '1');
    if (code) await AsyncStorage.setItem(LANG_KEY, code);
    else await AsyncStorage.removeItem(LANG_KEY);
  };

  return (
    <PreferencesContext.Provider value={{ language, onboarded, setLanguage, ready }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export const usePreferences = () => useContext(PreferencesContext);
