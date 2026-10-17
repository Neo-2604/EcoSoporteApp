import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Btn, Chips, Empty, ErrorBox, Field, H, Muted, notify, Screen } from '../../components/kit';
import { Ticket } from '../../components/ticket-card';

type Host = { id: number; name: string; company?: string | null; address: string; os?: string | null };

export default function NewRemote() {
  const { ticket } = useLocalSearchParams<{ ticket?: string }>();
  const [hosts, setHosts] = useState<Host[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [hostId, setHostId] = useState<number | null>(null);
  const [ticketId, setTicketId] = useState<number | null>(ticket ? Number(ticket) : null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api<Host[]>('/remote/hosts'), api<Ticket[]>('/tickets')])
      .then(([h, t]) => { setHosts(h); setTickets(t.filter(x => x.status !== 'Resuelto' && x.status !== 'Cerrado')); })
      .catch(e => setError(e instanceof Error ? e.message : 'No se pudieron cargar los equipos.'))
      .finally(() => setReady(true));
  }, []);

  async function submit() {
    setError('');
    if (!hostId) { setError('Elige el equipo.'); return; }
    if (reason.trim().length < 10) { setError('Explica el motivo (mínimo 10 caracteres).'); return; }
    setLoading(true);
    try {
      const r = await api<{ id: number }>('/remote/sessions', { method: 'POST', body: { host_id: hostId, ticket_id: ticketId, reason: reason.trim() } });
      notify('Solicitud enviada. Cuando Soporte TI la apruebe podrás iniciar la sesión.');
      router.replace(`/remote/${r.id}`);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'No se pudo crear la sesión.'); }
    finally { setLoading(false); }
  }

  return (
    <Screen back title="Nueva sesión remota" eyebrow="Soporte remoto" footer={<Btn title="Solicitar sesión" icon="terminal" loading={loading} onPress={submit} />}>
      <ErrorBox message={error} />
      <H>Equipo autorizado</H>
      {ready && !hosts.length ? <Empty text="No hay equipos disponibles para ti. Pide a Soporte TI que registre el equipo del cliente." /> : (
        <Chips options={hosts.map(h => String(h.id))} value={hostId ? String(hostId) : null} onChange={v => setHostId(v ? Number(v) : null)}
          label={v => { const h = hosts.find(x => String(x.id) === v); return h ? `${h.name}${h.company ? ' · ' + h.company : ''}` : v; }} />
      )}
      <H>Ticket relacionado</H>
      <Chips options={tickets.map(t => String(t.id))} value={ticketId ? String(ticketId) : null} onChange={v => setTicketId(v ? Number(v) : null)} all="Ninguno"
        label={v => { const t = tickets.find(x => String(x.id) === v); return t ? (t.code ?? `#${t.id}`) : `#${v}`; }} />
      <Muted style={{ marginBottom: 12 }}>Los técnicos deben relacionar un ticket asignado a ellos.</Muted>
      <Field label="Motivo de la sesión" value={reason} onChangeText={setReason} placeholder="Ej.: El equipo no tiene red; revisar adaptador y configuración IP." multiline />
    </Screen>
  );
}
