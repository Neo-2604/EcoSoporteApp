import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { api } from '../../api/client';
import { Btn, Card, Chips, ErrorBox, Field, H, IdChip, Loading, Muted, notify, Pill, Row, Screen } from '../../components/kit';
import { cop, fmtDate, quoteTone } from '../../lib/format';
import { useTheme } from '../../theme';

type Ev = { user_name?: string | null; status?: string | null; note?: string | null; public: boolean; created_at: string };
type Q = {
  id: number; code: string; item_name?: string | null; name: string; email: string; phone?: string | null; company?: string | null; city?: string | null;
  quantity?: string | null; message: string; status: string; quoted_amount?: number | null; created_at: string; events: Ev[];
};

export default function QuoteDetail() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [q, setQ] = useState<Q | null>(null);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [amount, setAmount] = useState(''); const [note, setNote] = useState(''); const [pub, setPub] = useState(false);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const d = await api<{ quote: Q; statuses: string[] }>(`/quotes/${id}`);
      setQ(d.quote); setStatuses(d.statuses); setStatus(d.quote.status);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'No se pudo cargar la solicitud.'); }
    finally { setLoading(false); }
  }, [id]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function save() {
    setSaving(true); setError('');
    try {
      await api(`/quotes/${id}`, { method: 'POST', body: { status, quoted_amount: amount.trim() || undefined, note: note.trim() || undefined, public: pub } });
      setAmount(''); setNote(''); setPub(false); await load(); notify('Solicitud actualizada.');
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'No se pudo guardar.'); }
    finally { setSaving(false); }
  }
  const dirty = !!q && (status !== q.status || !!note.trim() || !!amount.trim());

  return (
    <Screen back title={q?.name ?? 'Solicitud'} eyebrow={q?.code ?? 'Cotización'} refreshing={loading && !!q} onRefresh={load}
      footer={q ? <Btn title="Guardar cambios" icon="check" loading={saving} disabled={!dirty} onPress={save} /> : undefined}>
      <ErrorBox message={error} onRetry={q ? undefined : load} />
      {loading && !q ? <Loading /> : null}
      {q ? (
        <>
          <Card style={{ padding: 15 }}>
            <Row style={{ justifyContent: 'space-between' }}><IdChip code={q.code} /><Pill text={q.status} tone={quoteTone(q.status)} /></Row>
            <Text style={{ color: c.ink, fontWeight: '800', marginTop: 8 }}>{q.item_name ?? 'Consulta general'}</Text>
            <Text style={{ color: c.ink, marginTop: 6, lineHeight: 21 }}>{q.message}</Text>
            <View style={{ borderTopWidth: 1, borderColor: c.line, marginTop: 10, paddingTop: 10, gap: 3 }}>
              <Muted>Solicitante: <Text style={{ color: c.ink, fontWeight: '700' }}>{q.name}</Text>{q.company ? ` · ${q.company}` : ''}</Muted>
              <Muted>Correo: <Text style={{ color: c.ink, fontWeight: '700' }}>{q.email}</Text></Muted>
              {q.phone ? <Pressable onPress={() => { void Linking.openURL(`tel:${q.phone}`); }}><Muted>Celular: <Text style={{ color: c.accent, fontWeight: '800' }}>{q.phone}</Text></Muted></Pressable> : null}
              {q.city ? <Muted>Ciudad: {q.city}{q.quantity ? ` · Cantidad: ${q.quantity}` : ''}</Muted> : null}
              {q.quoted_amount ? <Muted>Valor cotizado: <Text style={{ color: c.ink, fontWeight: '800' }}>{cop(q.quoted_amount)}</Text></Muted> : null}
              <Muted>Recibida: {fmtDate(q.created_at)}</Muted>
            </View>
          </Card>

          <H>Estado</H>
          <Chips options={statuses} value={status} onChange={v => v && setStatus(v)} />
          <Field label="Valor cotizado (COP, opcional)" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="Ej. 250000" />
          <Field label="Nota" value={note} onChangeText={setNote} multiline placeholder="Detalle del avance o de la respuesta…" />
          <Pressable onPress={() => setPub(!pub)} accessibilityRole="checkbox" accessibilityState={{ checked: pub }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: c.accent, backgroundColor: pub ? c.accent : 'transparent' }} />
            <Text style={{ color: c.ink, flex: 1 }}>La nota es visible para el solicitante</Text>
          </Pressable>

          <H>Historial</H>
          {q.events.length ? q.events.map((e, i) => (
            <Card key={`${e.created_at}-${i}`} style={{ padding: 13 }}>
              <Row style={{ justifyContent: 'space-between' }}><Text style={{ color: c.ink, fontWeight: '800', flex: 1 }}>{e.user_name ?? 'Sistema'}</Text>{e.status ? <Pill text={e.status} tone={quoteTone(e.status)} /> : null}</Row>
              {e.note ? <Text style={{ color: c.muted, marginTop: 6, lineHeight: 20 }}>{e.note}</Text> : null}
              <Muted style={{ marginTop: 6, fontSize: 11 }}>{fmtDate(e.created_at)} · {e.public ? 'visible al solicitante' : 'nota interna'}</Muted>
            </Card>
          )) : <Muted>Sin movimientos todavía.</Muted>}
        </>
      ) : null}
    </Screen>
  );
}
