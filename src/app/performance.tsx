import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { api } from '../api/client';
import { Card, Chips, Empty, ErrorBox, H, IdChip, Loading, Muted, Pill, Row, Screen } from '../components/kit';
import { Icon } from '../components/icon';
import { cop, pct } from '../lib/format';
import { useTheme } from '../theme';

type Cond = { label: string; value: string; rule: string; ok: boolean };
type Perf = {
  id: number; name: string; tech_code?: string | null; tickets: number; excluded: number; points: number;
  quality: number | null; ans: number | null; satisfaction: number | null; ratings: number;
  bonus: null | { eligible: boolean; bonus_points: number; amount: number | null; conditions: Cond[] };
};
type Settlement = { id: number; period: string; user_name: string; status: string; total: number; bonus_amount: number };
type Data = {
  period: string; periods: string[]; role: string; show_money: boolean; legal_note: string;
  params: null | { goal_points: number; bonus_per_point: number; max_bonus_points: number; min_quality: number; min_ans: number; min_satisfaction: number };
  team: Perf[]; settlements: Settlement[];
};

const statusTone = (s: string) => (s === 'Pagado' ? 'ok' : s === 'Aprobado' ? 'accent' : 'warn') as 'ok' | 'accent' | 'warn';

export default function Performance() {
  const { c } = useTheme();
  const [period, setPeriod] = useState<string | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (p?: string | null) => {
    setLoading(true); setError('');
    try { const d = await api<Data>(`/performance${p ? `?periodo=${p}` : ''}`); setData(d); setPeriod(d.period); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'No se pudo cargar el desempeño.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(period); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [load]));

  const own = data?.role === 'Técnico';
  return (
    <Screen back title={own ? 'Mi desempeño' : 'Desempeño y nómina'} eyebrow="Resultados medidos" refreshing={loading && !!data} onRefresh={() => load(period)}>
      <ErrorBox message={error} onRetry={() => load(period)} />
      {loading && !data ? <Loading /> : null}
      {data ? (
        <>
          <Chips options={data.periods} value={period} onChange={v => { if (v) { setPeriod(v); void load(v); } }} />
          {!data.params ? <Card tone="warn"><Muted>Aún no hay parámetros de bono aprobados: se muestra el desempeño, pero sin bono.</Muted></Card> : (
            <Card style={{ padding: 13 }}>
              <Muted>Meta {data.params.goal_points} pts · tope {data.params.max_bonus_points} pts{data.show_money ? ` · ${cop(data.params.bonus_per_point)} por punto` : ''}. Calidad ≥ {pct(data.params.min_quality)}, ANS ≥ {pct(data.params.min_ans)}, satisfacción ≥ {data.params.min_satisfaction}.</Muted>
            </Card>
          )}
          {!data.show_money ? <Muted style={{ marginBottom: 10 }}>Los montos de dinero solo los ve el Administrador.</Muted> : null}

          {data.team.length ? data.team.map(t => (
            <Card key={t.id} style={{ padding: 15 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1, gap: 3 }}><Text style={{ color: c.ink, fontWeight: '800', fontSize: 16 }}>{t.name}</Text><IdChip code={t.tech_code} /></View>
                {t.bonus ? <Pill text={t.bonus.eligible ? 'Cumple condiciones' : 'No cumple'} tone={t.bonus.eligible ? 'ok' : 'warn'} /> : null}
              </Row>
              <Row style={{ marginTop: 12, gap: 8 }}>
                {([['Puntos', String(t.points)], ['Tickets', String(t.tickets)], ['ANS', pct(t.ans)], ['Calidad', pct(t.quality)]] as [string, string][]).map(([k, v]) => (
                  <View key={k} style={{ flex: 1, backgroundColor: c.cardAlt, borderRadius: 12, paddingVertical: 8, alignItems: 'center' }}>
                    <Text style={{ color: c.ink, fontWeight: '800', fontSize: 13.5 }}>{v}</Text><Text style={{ color: c.muted, fontSize: 10.5, fontWeight: '700' }}>{k}</Text>
                  </View>
                ))}
              </Row>
              <Muted style={{ marginTop: 8 }}>Satisfacción: {t.satisfaction == null ? `sin datos suficientes (${t.ratings} calificaciones)` : `${t.satisfaction.toFixed(2)} / 5`}{t.excluded ? ` · ${t.excluded} excluidos del bono` : ''}</Muted>
              {t.bonus ? (
                <View style={{ borderTopWidth: 1, borderColor: c.line, marginTop: 10, paddingTop: 10, gap: 6 }}>
                  {t.bonus.conditions.map(k => (
                    <Row key={k.label} style={{ alignItems: 'flex-start', gap: 8 }}>
                      <Icon name={k.ok ? 'check' : 'alert'} size={16} color={k.ok ? c.ok : c.warn} />
                      <Text style={{ color: c.ink, flex: 1, fontSize: 13 }}>{k.label}: <Text style={{ fontWeight: '800' }}>{k.value}</Text> <Text style={{ color: c.muted }}>({k.rule})</Text></Text>
                    </Row>
                  ))}
                  <Text style={{ color: c.ink, fontWeight: '800', marginTop: 4 }}>
                    Puntos bonificados: {t.bonus.bonus_points}{t.bonus.amount != null ? ` · Bono estimado: ${cop(t.bonus.amount)}` : ''}
                  </Text>
                </View>
              ) : null}
            </Card>
          )) : <Empty text="No hay técnicos con actividad en este periodo." />}

          {data.show_money ? (
            <>
              <H>{own ? 'Mis liquidaciones' : 'Liquidaciones'}</H>
              {data.settlements.length ? data.settlements.map(s => (
                <Card key={s.id} onPress={() => router.push(`/payroll/${s.id}`)} style={{ padding: 14 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, gap: 3 }}><Text style={{ color: c.ink, fontWeight: '800' }}>{s.period}{own ? '' : ` · ${s.user_name}`}</Text><Pill text={s.status} tone={statusTone(s.status)} /></View>
                    <Text style={{ color: c.ink, fontWeight: '800', fontSize: 16 }}>{cop(s.total)}</Text>
                    <Icon name="chevron" size={18} color={c.muted} />
                  </Row>
                </Card>
              )) : <Empty text={own ? 'Aún no tienes liquidaciones aprobadas.' : 'No hay liquidaciones generadas. Se crean desde la web.'} />}
              <Muted style={{ marginTop: 6 }}>La aprobación y el pago de nómina se gestionan en la web. La app solo consulta.</Muted>
            </>
          ) : null}
          <Muted style={{ marginTop: 10 }}>{data.legal_note}</Muted>
        </>
      ) : null}
    </Screen>
  );
}
