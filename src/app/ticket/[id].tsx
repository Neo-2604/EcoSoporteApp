import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api } from '../../api/client';
import { useAuth } from '../../auth';
import { Btn, Card, ErrorBox, Field, H, Loading, Muted, notify, Pill, priorityTone, Row, Screen, statusTone } from '../../components/kit';
import { SlaText, Ticket } from '../../components/ticket-card';
import { fmtDate, slaLeft } from '../../lib/format';
import { useNow } from '../../lib/hooks';
import { useTheme } from '../../theme';

type Update = { note: string; status?: string; created_at?: string; name?: string };
const STEPS = ['Abierto', 'En proceso', 'En espera', 'Resuelto'] as const;
const QUICK = ['Diagnóstico realizado', 'En camino al sitio', 'Se cambió la pieza', 'Pendiente respuesta del cliente', 'Prueba de conexión correcta'];

export default function TicketDetail() {
  const { c } = useTheme();
  const { isStaff, canRemote } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [note, setNote] = useState('');
  const [newStatus, setNewStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useNow(1000);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true); setError('');
    try {
      const d = await api<{ ticket: Ticket; updates: Update[] }>(`/tickets/${id}`);
      setTicket(d.ticket); setUpdates(d.updates ?? []); setNewStatus(null);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'No se pudo cargar el ticket.'); }
    finally { setLoading(false); }
  }, [id]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function save() {
    const st = newStatus && newStatus !== ticket?.status ? newStatus : undefined;
    if (!note.trim()) { setError(st ? 'Escribe una nota para registrar el cambio de estado.' : 'Escribe una nota antes de guardar.'); return; }
    setSaving(true); setError('');
    try {
      await api(`/tickets/${id}/notes`, { method: 'POST', body: { note: note.trim(), ...(st ? { status: st } : {}) } });
      setNote(''); await load();
      notify(st ? `Ticket actualizado a «${st}».` : 'Nota guardada.');
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'No se pudo guardar.'); }
    finally { setSaving(false); }
  }

  const sla = ticket ? slaLeft(ticket.solution_due, ticket.status) : null;
  const done = ticket?.status === 'Resuelto' || ticket?.status === 'Cerrado';
  const dirty = !!note.trim() || (!!newStatus && newStatus !== ticket?.status);

  return (
    <Screen back title={ticket?.title ?? 'Ticket'} eyebrow={ticket?.code ?? (id ? `#${id}` : '')} refreshing={loading && !!ticket} onRefresh={load}
      footer={ticket ? (
        <Row>
          {isStaff && canRemote && !done ? <Btn title="Soporte remoto" icon="terminal" variant="soft" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/remote/new', params: { ticket: String(ticket.id) } })} /> : null}
          <Btn title={newStatus === 'Resuelto' ? 'Resolver' : 'Guardar'} icon="check" loading={saving} disabled={!dirty} style={{ flex: 1 }} onPress={save} />
        </Row>
      ) : undefined}>
      {loading && !ticket ? <Loading /> : null}
      <ErrorBox message={error} onRetry={ticket ? undefined : load} />
      {ticket ? (
        <>
          <Card tone={done ? 'accent' : sla?.late || sla?.urgent ? 'danger' : undefined} style={{ padding: 16 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: c.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }}>{done ? 'ESTADO' : 'TIEMPO DE SOLUCIÓN (ANS)'}</Text>
                {done ? <Text style={{ color: c.ok, fontSize: 24, fontWeight: '800', marginTop: 2 }}>{ticket.status}</Text> : <View style={{ marginTop: 2 }}><SlaText due={ticket.solution_due} status={ticket.status} size={26} /></View>}
              </View>
              <Pill text={ticket.priority ?? 'Media'} tone={priorityTone(ticket.priority)} />
            </Row>
          </Card>

          {isStaff ? (
            <>
              <H>Estado</H>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                {STEPS.map(s => {
                  const on = (newStatus ?? ticket.status) === s;
                  return (
                    <Pressable key={s} onPress={() => setNewStatus(s)} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: on ? c.accent : c.card, borderWidth: 1, borderColor: on ? c.accent : c.line }}>
                      <Text style={{ color: on ? c.accentInk : c.muted, fontWeight: '800', fontSize: 11.5 }}>{s === 'En espera' ? 'Espera' : s}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : <Pill text={ticket.status ?? 'Abierto'} tone={statusTone(ticket.status)} />}

          <Card>
            {ticket.description ? <Text style={{ color: c.ink, lineHeight: 22 }}>{ticket.description}</Text> : null}
            <View style={{ borderTopWidth: 1, borderColor: c.line, marginTop: 12, paddingTop: 10, gap: 4 }}>
              <Muted>Empresa: <Text style={{ color: c.ink, fontWeight: '700' }}>{ticket.company ?? 'Sin empresa vinculada'}</Text></Muted>
              {ticket.creator ? <Muted>Solicitante: <Text style={{ color: c.ink, fontWeight: '700' }}>{ticket.creator}</Text></Muted> : null}
              {ticket.technician ? <Muted>Técnico: <Text style={{ color: c.ink, fontWeight: '700' }}>{ticket.technician}</Text></Muted> : null}
              {ticket.area ? <Muted>Área: <Text style={{ color: c.ink, fontWeight: '700' }}>{ticket.area}</Text>{ticket.category ? ` · ${ticket.category}` : ''}</Muted> : null}
            </View>
          </Card>

          <H>{isStaff ? 'Actualización de atención' : 'Agregar una nota'}</H>
          {isStaff ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {QUICK.map(q => (
                <Pressable key={q} onPress={() => setNote(n => (n ? n.replace(/\s+$/, '') + '. ' : '') + q)} style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: c.cardAlt, borderWidth: 1, borderColor: c.line }}>
                  <Text style={{ color: c.muted, fontSize: 11.5, fontWeight: '700' }}>+ {q}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <Field value={note} onChangeText={setNote} placeholder="Describe el avance o la atención realizada…" multiline />

          <H>Historial de atención</H>
          {updates.length ? updates.map((u, i) => (
            <Card key={`${u.created_at}-${i}`} style={{ padding: 13 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ color: c.ink, fontWeight: '800', flex: 1 }}>{u.name ?? 'Actualización'}</Text>
                {u.status ? <Pill text={u.status} tone={statusTone(u.status)} /> : null}
              </Row>
              <Text style={{ color: c.muted, marginTop: 6, lineHeight: 20 }}>{u.note}</Text>
              {u.created_at ? <Muted style={{ marginTop: 6, fontSize: 11 }}>{fmtDate(u.created_at)}</Muted> : null}
            </Card>
          )) : <Muted>Todavía no hay notas registradas.</Muted>}
        </>
      ) : null}
    </Screen>
  );
}
