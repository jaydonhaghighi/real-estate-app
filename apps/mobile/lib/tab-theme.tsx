import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';

export type TabThemeMode = 'dark' | 'light';

export interface TabThemeColors {
  background: string;
  surface: string;
  surfaceMuted: string;
  card: string;
  cardMuted: string;
  text: string;
  textSecondary: string;
  primary: string;
  accent: string;
  warning: string;
  border: string;
  tabBar: string;
  tabInactive: string;
  white: string;
}

const darkColors: TabThemeColors = {
  background: '#0B1220',
  surface: '#111A2E',
  surfaceMuted: '#15223C',
  card: '#101A2E',
  cardMuted: '#203353',
  text: '#E8F0FF',
  textSecondary: '#A4B6D5',
  primary: '#2E6BFF',
  accent: '#17B890',
  warning: '#FFB84D',
  border: '#213452',
  tabBar: '#0E1729',
  tabInactive: '#7E93B6',
  white: '#FFFFFF'
};

const lightColors: TabThemeColors = {
  background: '#F1F5FC',
  surface: '#FFFFFF',
  surfaceMuted: '#E9F0FB',
  card: '#FFFFFF',
  cardMuted: '#E7EEF9',
  text: '#0E172A',
  textSecondary: '#4B5C78',
  primary: '#2E6BFF',
  accent: '#17B890',
  warning: '#CC8B26',
  border: '#D4DEEE',
  tabBar: '#FFFFFF',
  tabInactive: '#7E93B6',
  white: '#FFFFFF'
};

interface TabThemeContextValue {
  mode: TabThemeMode;
  colors: TabThemeColors;
  setMode: (mode: TabThemeMode) => void;
  toggleMode: () => void;
}

const TabThemeContext = createContext<TabThemeContextValue | undefined>(undefined);

export function TabThemeProvider({ children }: PropsWithChildren): JSX.Element {
  const [mode, setMode] = useState<TabThemeMode>('dark');

  const value = useMemo<TabThemeContextValue>(
    () => ({
      mode,
      colors: mode === 'dark' ? darkColors : lightColors,
      setMode,
      toggleMode: () => setMode((prevMode) => (prevMode === 'dark' ? 'light' : 'dark'))
    }),
    [mode]
  );

  return <TabThemeContext.Provider value={value}>{children}</TabThemeContext.Provider>;
}

export function useTabTheme(): TabThemeContextValue {
  const context = useContext(TabThemeContext);
  if (!context) {
    throw new Error('useTabTheme must be used inside TabThemeProvider');
  }
  return context;
}
