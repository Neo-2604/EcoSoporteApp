import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './api/client';
import { openNotification } from './open-notification';

let current: string | null = null;

// En primer plano no se muestra la notificación del sistema: ya sale el aviso dentro de la app.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }),
});

// Pide permiso, obtiene el token del teléfono y lo registra en el servidor. Nunca lanza errores: si algo falla (sin permiso,
// sin Firebase configurado, sin red) la app sigue funcionando y los avisos llegan igual al abrirla.
export async function registerPush(): Promise<string | null> {
  try {
    if (Platform.OS !== 'android') return null;
    await Notifications.setNotificationChannelAsync('avisos', {
      name: 'Avisos de EcoSoporte', importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 250, 150, 250], lightColor: '#19c3a6',
    });
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return null;
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await api('/push/register', { method: 'POST', body: { token: data, platform: 'android' } });
    current = data;
    return data;
  } catch { return null; }
}

export async function unregisterPush() {
  const token = current; current = null;
  if (!token) return;
  try { await api('/push/unregister', { method: 'POST', body: { token } }); } catch { /* se limpia solo en el servidor */ }
}

type Data = { kind?: string; ticket_id?: number | string };
const toNotif = (d: Data) => ({ id: 0, kind: d.kind ?? '', title: '', created_at: '', ticket_id: d.ticket_id ? Number(d.ticket_id) : null });

// Al tocar la notificación del sistema abre el ticket (o «En vivo» para las conexiones), incluso si la app estaba cerrada.
export function listenPushTaps(): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener(r => openNotification(toNotif((r.notification.request.content.data ?? {}) as Data)));
  void Notifications.getLastNotificationResponseAsync().then(r => { if (r) openNotification(toNotif((r.notification.request.content.data ?? {}) as Data)); }).catch(() => {});
  return () => sub.remove();
}
