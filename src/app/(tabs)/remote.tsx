import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api } from '../../api/client';
import { Btn, Card, Empty, ErrorBox, Loading, Muted, Pill, Row, Screen } from '../../components/kit';
import { Icon } from '../../components/icon';
import { fmtDate } from '../../lib/format';
import { useTheme } from '../../theme';

export type RSession = {
  id: number; status: string; host_name: string; company?: string | null; ticket_id?: number | null; reason: string;
  technician?: string; created_at: string; ticket_code?: string;
};

export const rTone = (s: string) => (s === 'Activa' ? 'accent' : s === 'Aprobada' ? 'ok' : s === 'Solicitada' ? 'warn' : s === 'Escalada' || s === 'Rechazada' ? 'danger' : 'neutral') as 'accent' | 'ok' | 'warn' | 'danger' | 'neutral';

export default function RemoteList() {
  const { c } = useTheme();
  const [rows, setRows] = useState<RSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setRows(await api<RSession[]>('/remote/sessions')); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'No se pudieron cargar las sesiones.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const pending = rows.filter(r => ['Solicitada', 'Aprobada', 'Activa'].includes(r.status));
  const past = rows.filter(r => !pending.includes(r));

  return (
    <Screen tabs title="Soporte remoto" eyebrow="SSH · con auditoría" refreshing={loading && rows.length > 0} onRefresh={load}>
      <Card tone="accent">
        <Row><Icon name="shield" size={20} color={c.accent} /><Text style={{ color: c.ink, fontWeight: '800', flex: 1 }}>Conexión autorizada y registrada</Text></Row>
        <Muted style={{ marginTop: 6 }}>Pides la sesión, Soporte TI la aprueba y te conectas por SSH desde tu equipo. Si no se resuelve, se escala a visita presencial.</Muted>
      </Card>
      <Btn title="Nueva sesión remota" icon="plus" onPress={() => router.push('/remote/new')} style={{ marginBottom: 14 }} />
      <ErrorBox message={error} onRetry={load} />
      {loading && !rows.length ? <Loading /> : null}
      {pending.length ? <Text style={{ color: c.muted, fontWeight: '800', fontSize: 12, letterSpacing: 1, marginBottom: 8 }}>EN CURSO</Text> : null}
      {pending.map(r => <SessionCard key={r.id} r={r} />)}
      {past.length ? <Text style={{ color: c.muted, fontWeight: '800', fontSize: 12, letterSpacing: 1, marginVertical: 8 }}>HISTORIAL</Text> : null}
      {past.map(r => <SessionCard key={r.id} r={r} />)}
      {!loading && !rows.length && !error ? <Empty text="Aún no hay sesiones remotas." /> : null}
    </Screen>
  );
}

function SessionCard({ r }: { r: RSession }) {
  const { c } = useTheme();
  return (
    <Card onPress={() => router.push(`/remote/${r.id}`)} style={{ padding: 14 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row style={{ flex: 1 }}><Icon name="device" size={18} color={c.accent} /><Text numberOfLines={1} style={{ color: c.ink, fontWeight: '800', flex: 1 }}>{r.host_name}</Text></Row>
        <Pill text={r.status} tone={rTone(r.status)} />
      </Row>
      <Muted style={{ marginTop: 6 }} >{r.company ?? 'Sin empresa'}{r.technician ? ` · ${r.technician}` : ''}</Muted>
      <Text numberOfLines={2} style={{ color: c.muted, marginTop: 4 }}>{r.reason}</Text>
      <View style={{ marginTop: 6 }}><Muted style={{ fontSize: 11 }}>{fmtDate(r.created_at)}</Muted></View>
    </Card>
  );
}
