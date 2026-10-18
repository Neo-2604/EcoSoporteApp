import { router } from 'expo-router';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, Text, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from './api/client';
import { useAuth } from './auth';
import { useTheme } from './theme';

export type Notif = { id: number; kind: string; title: string; body?: string | null; actor_name?: string | null; ticket_id?: number | null; created_at: string };

type Ctx = { items: Notif[]; unread: number; markRead: () => Promise<void>; refresh: () => Promise<void>; banner: Notif | null; dismiss: () => void };
const NotifCtx = createContext<Ctx>({ items: [], unread: 0, markRead: async () => {}, refresh: async () => {}, banner: null, dismiss: () => {} });
export const useNotifications = () => useContext(NotifCtx);

export function openNotification(n: Notif) {
  if (n.ticket_id) router.push(`/ticket/${n.ticket_id}` as never);
  else if (n.kind === 'conexion') router.push('/live' as never);
}

// Consulta los avisos del servidor cada 20 s mientras la app está abierta: conexiones, tickets nuevos y asignaciones.
export function NotifProvider({ children }: { children: ReactNode }) {
  const { me, isStaff } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);
  const [seen, setSeen] = useState(0);
  const [banner, setBanner] = useState<Notif | null>(null);
  const maxId = useRef(0);
  const first = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    if (!me || !isStaff) return;
    try {
      const d = await api<{ items: Notif[]; unread: number; seen: number }>('/notifications?after=0');
      const fresh = d.items.filter(n => n.id > maxId.current);
      if (!first.current && fresh.length) {
        const newest = fresh[0];
        setBanner(newest); Vibration.vibrate(180);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setBanner(null), 7000);
      }
      first.current = false;
      maxId.current = Math.max(maxId.current, ...d.items.map(n => n.id), 0);
      setItems(d.items); setSeen(d.seen ?? 0);
    } catch { /* sin red: se reintenta en el siguiente ciclo */ }
  }, [me, isStaff]);

  useEffect(() => {
    if (!me || !isStaff) { setItems([]); first.current = true; maxId.current = 0; return; }
    void refresh();
    const t = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 20000);
    const sub = AppState.addEventListener('change', s => { if (s === 'active') void refresh(); });
    return () => { clearInterval(t); sub.remove(); };
  }, [me, isStaff, refresh]);

  const markRead = useCallback(async () => {
    if (!items.length) return;
    const upto = Math.max(...items.map(n => n.id));
    try { await api('/notifications/read', { method: 'POST', body: { upto } }); setSeen(upto); } catch { /* se reintenta al volver a abrir */ }
  }, [items]);

  const unread = items.filter(n => n.id > seen).length;
  return <NotifCtx.Provider value={{ items, unread, markRead, refresh, banner, dismiss: () => setBanner(null) }}>{children}</NotifCtx.Provider>;
}

// Aviso emergente en la parte superior (queda por debajo de la barra de notificaciones del teléfono).
export function NotifBanner() {
  const { banner, dismiss } = useNotifications();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  if (!banner) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: insets.top + 8, paddingHorizontal: 14, zIndex: 50 }}>
      <Pressable onPress={() => { dismiss(); openNotification(banner); }} accessibilityRole="alert"
        style={{ backgroundColor: c.card, borderColor: c.accent, borderWidth: 1, borderRadius: 16, padding: 14, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, elevation: 8 }}>
        <Text numberOfLines={2} style={{ color: c.ink, fontWeight: '800', fontSize: 14 }}>{banner.title}</Text>
        {banner.body ? <Text numberOfLines={2} style={{ color: c.muted, marginTop: 3, fontSize: 12.5 }}>{banner.body}</Text> : null}
      </Pressable>
    </View>
  );
}
