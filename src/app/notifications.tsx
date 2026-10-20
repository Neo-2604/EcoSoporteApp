import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Text, View } from 'react-native';
import { Btn, Card, confirm, Empty, Muted, Screen } from '../components/kit';
import { Notif, openNotification, useNotifications } from '../notifications';
import { useTheme } from '../theme';

const ICON: Record<string, string> = { ticket: '🎫', asignacion: '📌', conexion: '🟢', estado: '🔄', nota: '💬' };

function ago(t: string) {
  const d = (Date.now() - new Date(t.replace(' ', 'T') + 'Z').getTime()) / 1000;
  if (isNaN(d)) return '';
  if (d < 60) return 'ahora';
  if (d < 3600) return `${Math.floor(d / 60)} min`;
  if (d < 86400) return `${Math.floor(d / 3600)} h`;
  return `${Math.floor(d / 86400)} d`;
}

export default function Notifications() {
  const { c } = useTheme();
  const { items, unread, markRead, clear, refresh } = useNotifications();
  useFocusEffect(useCallback(() => { void refresh().then(() => markRead()); }, [refresh, markRead]));
  return (
    <Screen back title="Notificaciones" eyebrow={unread ? `${unread} nuevas` : 'Al día'} onRefresh={refresh}>
      {items.length ? <Btn title="Borrar todas" variant="soft" icon="trash" style={{ marginBottom: 12 }} onPress={() => confirm('¿Borrar todas tus notificaciones?', () => { void clear(); }, 'Borrar')} /> : null}
      {items.length ? items.map((n: Notif) => (
        <Card key={n.id} onPress={() => openNotification(n)} style={{ padding: 13 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Text style={{ fontSize: 20 }}>{ICON[n.kind] ?? '🔔'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.ink, fontWeight: '800' }}>{n.title}</Text>
              {n.body ? <Text style={{ color: c.muted, marginTop: 3, lineHeight: 19 }}>{n.body}</Text> : null}
              <Muted style={{ marginTop: 5, fontSize: 11 }}>{ago(n.created_at)}</Muted>
            </View>
          </View>
        </Card>
      )) : <Empty text="Todavía no tienes notificaciones. Aquí verás quién se conecta, los tickets nuevos y las asignaciones." />}
    </Screen>
  );
}
