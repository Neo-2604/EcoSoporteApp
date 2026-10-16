import * as SecureStore from 'expo-secure-store';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';

export type Mode = 'system' | 'light' | 'dark';

export type Palette = {
  bg: string; card: string; cardAlt: string; line: string;
  ink: string; muted: string; accent: string; accentInk: string; accentSoft: string;
  danger: string; dangerSoft: string; warn: string; warnSoft: string; ok: string; okSoft: string;
  inputBg: string; tabBar: string; terminal: string;
};

const light: Palette = {
  bg: '#F2FAF9', card: '#FFFFFF', cardAlt: '#EAF6F4', line: '#D9EAE8',
  ink: '#123F4B', muted: '#68848C', accent: '#00A88F', accentInk: '#FFFFFF', accentSoft: '#DDF5F0',
  danger: '#C23B3B', dangerSoft: '#FDEAEA', warn: '#A96005', warnSoft: '#FFF0DF', ok: '#24814B', okSoft: '#E5F8EC',
  inputBg: '#F8FCFB', tabBar: '#FFFFFF', terminal: '#0B2A31',
};

// Misma identidad que el diseño aprobado: fondo azul petróleo y acento turquesa.
const dark: Palette = {
  bg: '#0B1F24', card: '#12313A', cardAlt: '#0E2A31', line: '#1F4650',
  ink: '#E6F7F4', muted: '#8FB2B4', accent: '#19C3A6', accentInk: '#063A43', accentSoft: '#0B3B44',
  danger: '#FF8C8C', dangerSoft: '#3A1F26', warn: '#F5B544', warnSoft: '#2D2713', ok: '#5ED69A', okSoft: '#12342A',
  inputBg: '#0E2A31', tabBar: '#0E2A31', terminal: '#06141A',
};

const KEY = 'ecosoporte_theme';

async function readMode(): Promise<Mode | null> {
  try {
    const v = Platform.OS === 'web' ? localStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    return v === 'light' || v === 'dark' || v === 'system' ? v : null;
  } catch { return null; }
}
async function writeMode(m: Mode) {
  try {
    if (Platform.OS === 'web') localStorage.setItem(KEY, m);
    else await SecureStore.setItemAsync(KEY, m);
  } catch { /* sin almacenamiento: se usa solo en esta sesión */ }
}

type Ctx = { c: Palette; dark: boolean; mode: Mode; setMode: (m: Mode) => void };
const ThemeCtx = createContext<Ctx>({ c: light, dark: false, mode: 'system', setMode: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<Mode>('system');

  useEffect(() => { readMode().then(m => m && setModeState(m)); }, []);

  const setMode = useCallback((m: Mode) => { setModeState(m); void writeMode(m); }, []);
  const isDark = mode === 'dark' || (mode === 'system' && system === 'dark');
  const value = useMemo(() => ({ c: isDark ? dark : light, dark: isDark, mode, setMode }), [isDark, mode, setMode]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
