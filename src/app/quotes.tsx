import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { api } from '../api/client';
import { Card, Chips, Empty, ErrorBox, IdChip, Loading, Muted, Pill, Row, Screen } from '../components/kit';
import { Icon } from '../components/icon';
import { ago, quoteTone } from '../lib/format';
import { useTheme } from '../theme';

type Quote = { id: number; code: string; item_name?: string | null; name: string; company?: string | null; status: string; created_at: string };

export default function Quotes() {
  const { c } = useTheme();
  const [status, setStatus] = useState<string | null>(null);
  const [rows, setRows] = useState<Quote[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (st: string | null) => {
    setLoading(true); setError('');
    try {
      const d = await api<{ quotes: Quote[]; counts: Record<string, number>; statuses: string[] }>(`/quotes${st ? `?estado=${encodeURIComponent(st)}` : ''}`);
      setRows(d.quotes); setCounts(d.counts); setStatuses(d.statuses);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'No se pudieron cargar las cotizaciones.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(status); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [load]));

  return (
    <Screen back title="Cotizaciones" eyebrow="Solicitudes de clientes" refreshing={loading && !!rows.length} onRefresh={() => load(status)}>
      <Chips options={statuses} value={status} onChange={v => { setStatus(v); void load(v); }} all="Todas" label={s => `${s} (${counts[s] ?? 0})`} />
      <ErrorBox message={error} onRetry={() => load(status)} />
      {loading && !rows.length ? <Loading /> : null}
      {!loading && !error && !rows.length ? <Empty text="No hay solicitudes en este estado." /> : null}
      {rows.map(q => (
        <Card key={q.id} onPress={() => router.push(`/quote/${q.id}`)} style={{ padding: 14 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1, gap: 4 }}>
              <IdChip code={q.code} />
              <Text style={{ color: c.ink, fontWeight: '800' }}>{q.name}{q.company ? ` · ${q.company}` : ''}</Text>
              <Muted>{q.item_name ?? 'Consulta general'} · {ago(q.created_at)}</Muted>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}><Pill text={q.status} tone={quoteTone(q.status)} /><Icon name="chevron" size={18} color={c.muted} /></View>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
