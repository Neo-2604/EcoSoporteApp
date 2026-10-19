import { router, usePathname, useSegments } from 'expo-router';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { api, AuthError, getToken, setToken } from './api/client';
import { unregisterPush } from './push';

export type Me = {
  id: number; name: string; email?: string; role: string; area?: string | null;
  company_id?: number | null; tech_code?: string | null;
};

type Ctx = {
  me: Me | null; ready: boolean;
  refresh: () => Promise<void>; signIn: (token: string) => Promise<void>; signOut: () => Promise<void>;
  isStaff: boolean; isAdmin: boolean; canRemote: boolean;
};

const AuthCtx = createContext<Ctx>({
  me: null, ready: false, refresh: async () => {}, signIn: async () => {}, signOut: async () => {},
  isStaff: false, isAdmin: false, canRemote: false,
});

// Identificador de esta apertura de la app (para la "actividad en vivo" del administrador).
const SID = 'app-' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const segments = useSegments();
  const pathname = usePathname();
  const lastPath = useRef('');

  const refresh = useCallback(async () => {
    const t = await getToken();
    if (!t) { setMe(null); setReady(true); return; }
    try {
      setMe(await api<Me>('/me'));
    } catch (e) {
      if (e instanceof AuthError || (e instanceof Error && /No autenticado|Sesión vencida|Cuenta inactiva/i.test(e.message))) {
        await setToken(null); setMe(null);
      }
      // otro error (sin red): se conserva la sesión y las pantallas muestran "Reintentar"
    } finally { setReady(true); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  // Protección de rutas
  useEffect(() => {
    if (!ready) return;
    const inLogin = segments[0] === 'login';
    if (!me && !inLogin) router.replace('/login');
    else if (me && inLogin) router.replace('/');
  }, [ready, me, segments]);

  // Presencia: avisa al servidor que esta persona está en la app (cada minuto y al cambiar de pantalla).
  const ping = useCallback((view: boolean) => {
    if (!me) return;
    void api('/ping', { method: 'POST', body: { sid: SID, kind: 'app', path: pathname, view } }).catch(() => {});
  }, [me, pathname]);

  useEffect(() => {
    if (!me) return;
    const changed = lastPath.current !== pathname;
    lastPath.current = pathname;
    ping(changed);
    const timer = setInterval(() => ping(false), 60000);
    const sub = AppState.addEventListener('change', s => { if (s === 'active') ping(false); });
    return () => { clearInterval(timer); sub.remove(); };
  }, [me, pathname, ping]);

  const signIn = useCallback(async (token: string) => { await setToken(token); await refresh(); }, [refresh]);
  const signOut = useCallback(async () => { await unregisterPush(); await setToken(null); setMe(null); router.replace('/login'); }, []);

  const role = me?.role ?? '';
  const value: Ctx = {
    me, ready, refresh, signIn, signOut,
    isStaff: role === 'Administrador' || role === 'Soporte TI' || role === 'Técnico',
    isAdmin: role === 'Administrador',
    canRemote: role === 'Administrador' || role === 'Soporte TI' || role === 'Técnico',
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
