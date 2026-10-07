import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { STORAGE_KEYS } from '../utils/constants';

export const ThemeContext = createContext(null);

const THEMES = ['dark', 'light'];

const readInitialTheme = () => {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEYS.THEME);
    return THEMES.includes(saved) ? saved : 'dark';
  } catch {
    return 'dark';
  }
};

// Dark is the default. Light values already exist in index.css under
// [data-theme="light"], so enabling it later is a UI decision only.
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch {
      /* preference simply will not persist */
    }
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
