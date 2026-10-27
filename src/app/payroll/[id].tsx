import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { api } from '../../api/client';
import { Card, ErrorBox, H, Loading, Muted, Pill, Row, Screen } from '../../components/kit';
import { Icon } from '../../components/icon';
import { cop, fmtDate, pct } from '../../lib/format';
import { useTheme } from '../../theme';

type S = {
  id: number; period: string; user_name: string; user_code?: string | null; status: string; base_salary: number; transport_aid: number;
  bonus_amount: number; total: number; points: number; tickets: number; quality: number | null; ans: number | null; satisfaction: number | null;
  bonus_points: number; approved_name?: string | null; paid_at?: string | null; payment_ref?: string | null;
  lines?: { label: string; value: string; note: string }[]; conditions?: { label: string; value: string; rule: string; ok: boolean }[];
};

export default function Settlement() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [s, setS] = useState<S | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setS((await api<{ settlement: S }>(`/payroll/settlements/${id}`)).settlement); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'No se pudo cargar la liquidación.'); }
    finally { setLoading(false); }
  }, [id]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const rows: [string, string][] = s ? [['Salario base', cop(s.base_salary)], ['Auxilio de transporte', cop(s.transport_aid)], ['Bono por desempeño', cop(s.bonus_amount)]] : [];
  return (
    <Screen back title={s ? `Liquidación ${s.period}` : 'Liquidación'} eyebrow={s?.user_name ?? 'Nómina'} refreshing={loading && !!s} onRefresh={load}>
      <ErrorBox message={error} onRetry={load} />
      {loading && !s ? <Loading /> : null}
      {s ? (
        <>
          <Card tone="accent" style={{ padding: 16 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View><Text style={{ color: c.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }}>TOTAL</Text><Text style={{ color: c.ink, fontSize: 28, fontWeight: '800' }}>{cop(s.total)}</Text></View>
              <Pill text={s.status} tone={s.status === 'Pagado' ? 'ok' : s.status === 'Aprobado' ? 'accent' : 'warn'} />
            </Row>
          </Card>
          <Card>
            {rows.map(([k, v]) => <Row key={k} style={{ justifyContent: 'space-between', paddingVertical: 5 }}><Text style={{ color: c.muted }}>{k}</Text><Text style={{ color: c.ink, fontWeight: '800' }}>{v}</Text></Row>)}
            {s.approved_name ? <Muted style={{ marginTop: 6 }}>Aprobó: {s.approved_name}</Muted> : null}
            {s.paid_at ? <Muted>Pago registrado: {fmtDate(s.paid_at)}{s.payment_ref ? ` · Ref. ${s.payment_ref}` : ''}</Muted> : null}
          </Card>
          <H>Desempeño del periodo</H>
          <Card>
            <Muted>Puntos: <Text style={{ color: c.ink, fontWeight: '800' }}>{s.points}</Text> · Tickets: <Text style={{ color: c.ink, fontWeight: '800' }}>{s.tickets}</Text></Muted>
            <Muted>ANS: <Text style={{ color: c.ink, fontWeight: '800' }}>{pct(s.ans)}</Text> · Calidad: <Text style={{ color: c.ink, fontWeight: '800' }}>{pct(s.quality)}</Text> · Satisfacción: <Text style={{ color: c.ink, fontWeight: '800' }}>{s.satisfaction == null ? 'sin datos' : s.satisfaction.toFixed(2)}</Text></Muted>
          </Card>
          {s.conditions?.length ? (
            <>
              <H>Condiciones del bono</H>
              <Card style={{ gap: 6 }}>
                {s.conditions.map(k => (
                  <Row key={k.label} style={{ alignItems: 'flex-start', gap: 8 }}>
                    <Icon name={k.ok ? 'check' : 'alert'} size={16} color={k.ok ? c.ok : c.warn} />
                    <Text style={{ color: c.ink, flex: 1, fontSize: 13 }}>{k.label}: <Text style={{ fontWeight: '800' }}>{k.value}</Text> <Text style={{ color: c.muted }}>({k.rule})</Text></Text>
                  </Row>
                ))}
              </Card>
            </>
          ) : null}
          {s.lines?.length ? (
            <>
              <H>Cómo se calculó el bono</H>
              <Card>
                {s.lines.map(l => <View key={l.label} style={{ paddingVertical: 5 }}><Row style={{ justifyContent: 'space-between' }}><Text style={{ color: c.ink, flex: 1 }}>{l.label}</Text><Text style={{ color: c.ink, fontWeight: '800' }}>{l.value}</Text></Row><Muted>{l.note}</Muted></View>)}
              </Card>
            </>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
