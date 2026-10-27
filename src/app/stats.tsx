import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { api } from '../api/client';
import { Card, Chips, Empty, ErrorBox, H, Loading, Muted, Pill, Row, Screen } from '../components/kit';
import { useTheme } from '../theme';

type Bd = { label: string; n: number }[];
type Risk = { code: string; id: number; title: string; level: string; why: string[] };
type Stats = {
  days: number; total: number; by_status: Bd; by_category: Bd; by_priority: Bd; by_area: Bd; last30: { day: string; n: number }[];
  forecast: { ready: boolean; reason?: string; next_week?: number; low?: number; high?: number; avg?: number; method?: string };
  risk: Risk[];
  sla: { ready: boolean; reason?: string; pct?: number; n?: number; by?: { category: string; n: number; pct: number }[] };
  recurrent: { size: number; company: string; terms: string[]; tickets: { id: number; code: string; title: string; status: string }[] }[];
  recommendations: { kind: string; text: string; action: string }[];
};
const DAYS = ['30', '90', '180', '365'] as const;

function Bars({ data }: { data: Bd }) {
  const { c } = useTheme();
  const max = Math.max(1, ...data.map(d => d.n));
  return (
    <View style={{ gap: 8 }}>
      {data.map(d => (
        <View key={d.label}>
          <Row style={{ justifyContent: 'space-between' }}><Text style={{ color: c.ink, fontSize: 13, flex: 1 }} numberOfLines={1}>{d.label}</Text><Text style={{ color: c.ink, fontWeight: '800', fontSize: 13 }}>{d.n}</Text></Row>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: c.cardAlt, marginTop: 3 }}><View style={{ height: 8, borderRadius: 4, backgroundColor: c.accent, width: `${Math.max(3, (d.n / max) * 100)}%` }} /></View>
        </View>
      ))}
    </View>
  );
}

export default function StatsScreen() {
  const { c } = useTheme();
  const [days, setDays] = useState<(typeof DAYS)[number]>('90');
  const [d, setD] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (dd: string) => {
    setLoading(true); setError('');
    try { setD(await api<Stats>(`/stats?dias=${dd}`)); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'No se pudieron cargar las estadísticas.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(days); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [load]));

  const max30 = Math.max(1, ...(d?.last30.map(x => x.n) ?? [1]));
  return (
    <Screen back title="Estadísticas" eyebrow="Analítica de tickets" refreshing={loading && !!d} onRefresh={() => load(days)}>
      <Chips options={DAYS} value={days} onChange={v => { if (v) { setDays(v); void load(v); } }} label={v => `${v} días`} />
      <ErrorBox message={error} onRetry={() => load(days)} />
      {loading && !d ? <Loading /> : null}
      {d ? (
        <>
          <Card tone="accent" style={{ padding: 16 }}><Text style={{ color: c.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }}>TICKETS EN {d.days} DÍAS</Text><Text style={{ color: c.ink, fontSize: 30, fontWeight: '800' }}>{d.total}</Text></Card>

          <H>Últimos 30 días</H>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 70 }}>
              {d.last30.map(x => <View key={x.day} style={{ flex: 1, height: `${Math.max(4, (x.n / max30) * 100)}%`, backgroundColor: x.n ? c.accent : c.cardAlt, borderRadius: 2 }} />)}
            </View>
            <Muted style={{ marginTop: 6 }}>Pico diario: {max30 === 1 && !d.last30.some(x => x.n) ? 0 : max30} tickets</Muted>
          </Card>

          <H>Carga prevista</H>
          <Card>
            {d.forecast.ready ? (
              <>
                <Text style={{ color: c.ink, fontSize: 22, fontWeight: '800' }}>≈ {d.forecast.next_week} tickets la próxima semana</Text>
                <Muted>Rango probable {d.forecast.low} a {d.forecast.high} · promedio {d.forecast.avg}</Muted>
                <Muted style={{ marginTop: 4 }}>{d.forecast.method}</Muted>
              </>
            ) : <Muted>Datos insuficientes. {d.forecast.reason}</Muted>}
          </Card>

          <H>Riesgo de incumplir el ANS</H>
          {d.risk.length ? d.risk.map(r => (
            <Card key={r.id} onPress={() => router.push(`/ticket/${r.id}`)} tone={r.level === 'Vencido' ? 'danger' : r.level === 'Alto' ? 'warn' : undefined} style={{ padding: 13 }}>
              <Row style={{ justifyContent: 'space-between' }}><Text style={{ color: c.ink, fontWeight: '800', flex: 1 }} numberOfLines={2}>{r.code} · {r.title}</Text><Pill text={r.level} tone={r.level === 'Medio' ? 'neutral' : r.level === 'Alto' ? 'warn' : 'danger'} /></Row>
              <Muted style={{ marginTop: 4 }}>{r.why.join(' · ')}</Muted>
            </Card>
          )) : <Empty text="No hay tickets abiertos en riesgo." />}

          <H>Cumplimiento histórico del ANS</H>
          <Card>
            {d.sla.ready ? (
              <>
                <Text style={{ color: c.ink, fontSize: 22, fontWeight: '800' }}>{d.sla.pct}% a tiempo <Text style={{ color: c.muted, fontSize: 13 }}>({d.sla.n} tickets)</Text></Text>
                {d.sla.by?.map(b => <Muted key={b.category}>{b.category}: {b.pct}% de {b.n}</Muted>)}
              </>
            ) : <Muted>Datos insuficientes. {d.sla.reason}</Muted>}
          </Card>

          <H>Por estado</H><Card><Bars data={d.by_status} /></Card>
          <H>Por categoría</H><Card><Bars data={d.by_category} /></Card>
          <H>Por prioridad</H><Card><Bars data={d.by_priority} /></Card>
          <H>Por área</H><Card><Bars data={d.by_area} /></Card>

          <H>Tickets recurrentes</H>
          {d.recurrent.length ? d.recurrent.map((g, i) => (
            <Card key={i} style={{ padding: 13 }}>
              <Text style={{ color: c.ink, fontWeight: '800' }}>{g.size} tickets parecidos · {g.company}</Text>
              {g.terms.length ? <Muted>Términos comunes: {g.terms.join(', ')}</Muted> : null}
              {g.tickets.map(t => <Text key={t.id} onPress={() => router.push(`/ticket/${t.id}`)} style={{ color: c.accent, fontWeight: '700', marginTop: 4 }} numberOfLines={1}>{t.code} · {t.title}</Text>)}
            </Card>
          )) : <Empty text="No se detectaron tickets recurrentes." />}

          <H>Recomendaciones</H>
          {d.recommendations.length ? d.recommendations.map((r, i) => (
            <Card key={i} style={{ padding: 13 }}><Pill text={r.kind} tone="accent" /><Text style={{ color: c.ink, marginTop: 6, fontWeight: '700' }}>{r.text}</Text><Muted style={{ marginTop: 3 }}>{r.action}</Muted></Card>
          )) : <Muted>Sin recomendaciones por ahora.</Muted>}
        </>
      ) : null}
    </Screen>
  );
}
