import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Share, Text, View } from 'react-native';
import { api } from '../../api/client';
import { useAuth } from '../../auth';
import { Btn, Card, confirm, ErrorBox, Field, H, Loading, Muted, notify, Pill, Row, Screen } from '../../components/kit';
import { fmtDate } from '../../lib/format';
import { useTheme } from '../../theme';
import { rTone } from '../(tabs)/remote';

type Detail = {
  id: number; status: string; host_name: string; company?: string | null; address: string; port: number; ssh_user: string; os?: string | null;
  reason: string; technician?: string; technician_id: number; ticket_id?: number | null; summary?: string | null; outcome?: string | null;
  events: { action: string; detail?: string | null; created_at: string; name?: string | null }[];
  connection?: { command: string; fingerprint?: string | null; bastion?: string | null } | null;
};

export default function RemoteDetail() {
  const { c } = useTheme();
  const { me } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [s, setS] = useState<Detail | null>(null);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setS(await api<Detail>(`/remote/sessions/${id}`)); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'No se pudo cargar la sesión.'); }
    finally { setLoading(false); }
  }, [id]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function act(action: string, body: object = {}) {
    setBusy(true); setError('');
    try { await api(`/remote/sessions/${id}/${action}`, { method: 'POST', body }); setSummary(''); await load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'No se pudo completar la acción.'); }
    finally { setBusy(false); }
  }

  const coord = me?.role === 'Administrador' || me?.role === 'Soporte TI';
  const mine = s?.technician_id === me?.id;

  return (
    <Screen back title={s?.host_name ?? 'Sesión remota'} eyebrow={`Sesión #${id}`} refreshing={loading && !!s} onRefresh={load}
      right={s ? <Pill text={s.status} tone={rTone(s.status)} /> : undefined}>
      {loading && !s ? <Loading /> : null}
      <ErrorBox message={error} onRetry={s ? undefined : load} />
      {s ? (
        <>
          <Card>
            <Muted>{s.company ?? 'Sin empresa'} · {s.address}:{s.port} · usuario {s.ssh_user}{s.os ? ` · ${s.os}` : ''}</Muted>
            <Text style={{ color: c.ink, marginTop: 8, lineHeight: 21 }}>{s.reason}</Text>
            {s.technician ? <Muted style={{ marginTop: 8 }}>Técnico: {s.technician}</Muted> : null}
          </Card>

          {s.connection ? (
            <>
              <H>Conéctate desde tu equipo</H>
              <View style={{ backgroundColor: c.terminal, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: c.line }}>
                <Text style={{ color: '#8FB2B4', fontSize: 11, marginBottom: 6 }}>sesión autorizada · registrada en auditoría</Text>
                <Text selectable style={{ color: '#9FE8D8', fontFamily: 'monospace', fontSize: 13, lineHeight: 20 }}>$ {s.connection.command}</Text>
                {s.connection.fingerprint ? <Text selectable style={{ color: '#8FB2B4', fontFamily: 'monospace', fontSize: 11, marginTop: 8 }}>huella: {s.connection.fingerprint}</Text> : null}
              </View>
              <Muted style={{ marginTop: 6 }}>Usa tu llave SSH personal. EcoSoporte nunca guarda contraseñas ni llaves.</Muted>
              <Btn title="Compartir comando" variant="ghost" style={{ marginTop: 10 }} onPress={() => { void Share.share({ message: s.connection!.command }); }} />
            </>
          ) : null}

          {coord && s.status === 'Solicitada' ? (
            <Row style={{ marginTop: 12 }}>
              <Btn title="Rechazar" variant="danger" style={{ flex: 1 }} loading={busy} onPress={() => confirm('¿Rechazar esta solicitud?', () => act('reject'))} />
              <Btn title="Aprobar" style={{ flex: 1 }} loading={busy} onPress={() => act('approve')} />
            </Row>
          ) : null}
          {mine && s.status === 'Aprobada' ? <Btn title="Iniciar sesión" icon="terminal" style={{ marginTop: 12 }} loading={busy} onPress={() => act('start')} /> : null}
          {s.status === 'Solicitada' && mine && !coord ? <Muted style={{ marginTop: 10 }}>Esperando aprobación de Soporte TI o del administrador.</Muted> : null}

          {s.status === 'Activa' && (mine || coord) ? (
            <>
              <H>Cerrar o escalar</H>
              <Field value={summary} onChangeText={setSummary} placeholder="¿Qué hiciste y cuál fue el resultado? (mínimo 10 caracteres)" multiline />
              <Row>
                <Btn title="Escalar a visita" variant="warn" style={{ flex: 1 }} loading={busy} onPress={() => summary.trim().length < 10 ? notify('Describe qué hiciste (mínimo 10 caracteres).') : confirm('Se creará una visita presencial con el contexto de esta sesión.', () => act('escalate', { summary: summary.trim() }))} />
                <Btn title="Cerrar" style={{ flex: 1 }} loading={busy} onPress={() => summary.trim().length < 10 ? notify('Describe qué hiciste (mínimo 10 caracteres).') : act('close', { summary: summary.trim() })} />
              </Row>
            </>
          ) : null}
          {s.summary ? <Card style={{ marginTop: 12 }}><Text style={{ color: c.ink, fontWeight: '800' }}>Resultado: {s.outcome ?? s.status}</Text><Muted style={{ marginTop: 4 }}>{s.summary}</Muted></Card> : null}

          <H>Auditoría</H>
          {s.events.map((e, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent, marginTop: 6 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.ink, fontWeight: '700' }}>{e.action}</Text>
                {e.detail ? <Muted>{e.detail}</Muted> : null}
                <Muted style={{ fontSize: 11 }}>{e.name ?? ''} · {fmtDate(e.created_at)}</Muted>
              </View>
            </View>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
