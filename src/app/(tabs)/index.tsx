import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api } from '../../api/client';
import { useAuth } from '../../auth';
import { Avatar, Card, ErrorBox, H, Loading, Muted, Pill, Row, Screen } from '../../components/kit';
import { Icon, IconName } from '../../components/icon';
import { useNotifications } from '../../notifications';
import { SlaText, Ticket, TicketCard } from '../../components/ticket-card';
import { slaLeft } from '../../lib/format';
import { useNow } from '../../lib/hooks';
import { useTheme } from '../../theme';

type Counts = Record<string, number>;

function greeting() {
  const h = new Date(Date.now() - 5 * 3600000).getUTCHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

export default function Home() {
  const { c } = useTheme();
  const { me, isAdmin, isStaff, canRemote } = useAuth();
  const { unread } = useNotifications();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [counts, setCounts] = useState<Counts>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useNow(30000);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [t, d] = await Promise.all([api<Ticket[]>('/tickets'), api<{ counts?: Counts }>('/dashboard')]);
      setTickets(t); setCounts(d.counts ?? {});
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el panel.');
    } finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const active = tickets.filter(t => t.status !== 'Resuelto' && t.status !== 'Cerrado');
  // Prioriza lo que vence antes (el ANS manda)
  const byUrgency = [...active].sort((a, b) => (slaLeft(a.solution_due, a.status)?.ms ?? 9e15) - (slaLeft(b.solution_due, b.status)?.ms ?? 9e15));
  const next = byUrgency[0];
  const nextSla = next ? slaLeft(next.solution_due, next.status) : null;
  const late = active.filter(t => slaLeft(t.solution_due, t.status)?.late).length;

  const actions: { icon: IconName; label: string; go: () => void; show: boolean }[] = [
    { icon: 'plus', label: 'Nuevo ticket', go: () => router.push('/new-ticket'), show: true },
    { icon: 'terminal', label: 'Soporte remoto', go: () => router.push('/remote'), show: canRemote },
    { icon: 'users', label: 'Directorio', go: () => router.push('/directory'), show: true },
    { icon: 'pulse', label: 'En vivo', go: () => router.push('/live'), show: isAdmin },
  ];

  return (
    <Screen tabs refreshing={loading} onRefresh={load}
      right={(
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable onPress={() => router.push('/notifications' as never)} accessibilityLabel="Notificaciones" hitSlop={6}
              style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="bell" size={20} color={c.ink} />
              {unread ? <View style={{ position: 'absolute', top: -5, right: -5, minWidth: 19, height: 19, borderRadius: 10, backgroundColor: c.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{unread > 99 ? '99+' : unread}</Text></View> : null}
            </Pressable>
          <Pressable onPress={() => router.push('/profile')} accessibilityLabel="Mi perfil"><Avatar name={me?.name ?? '?'} size={44} /></Pressable>
        </View>
      )}
      title={`${greeting()}, ${me?.name?.split(' ')[0] ?? ''}`} eyebrow={isStaff ? 'Mi jornada' : 'Mis solicitudes'}>
      <ErrorBox message={error} onRetry={load} />
      {loading && !tickets.length && !error ? <Loading text="Cargando…" /> : null}

      {next ? (
        <Card tone={nextSla?.late || nextSla?.urgent ? 'danger' : 'accent'} onPress={() => router.push(`/ticket/${next.id}`)} style={{ padding: 16 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: nextSla?.late || nextSla?.urgent ? c.danger : c.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }}>
              {nextSla?.late ? 'ANS VENCIDO' : 'PRÓXIMO A VENCER'}
            </Text>
            <Pill text={next.priority ?? 'Media'} tone={next.priority === 'Crítica' ? 'danger' : next.priority === 'Alta' ? 'warn' : 'neutral'} />
          </Row>
          <View style={{ marginTop: 6 }}><SlaText due={next.solution_due} status={next.status} size={28} /></View>
          <Text numberOfLines={2} style={{ color: c.ink, fontWeight: '800', fontSize: 15, marginTop: 8 }}>{next.code ?? `#${next.id}`} · {next.title}</Text>
          <Muted style={{ marginTop: 2 }}>{next.company ?? 'Sin empresa vinculada'}</Muted>
        </Card>
      ) : !loading && !error ? <Card tone="accent"><Text style={{ color: c.ink, fontWeight: '800' }}>Sin pendientes 🎉</Text><Muted>No tienes tickets en curso.</Muted></Card> : null}

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {([['Abiertos', counts['Abierto'], 'Abierto'], ['En proceso', counts['En proceso'], 'En proceso'], ['En espera', counts['En espera'], 'En espera'], ['Vencidos', late, 'Vencidos']] as [string, number | undefined, string][]).map(([k, v, f]) => (
          <Pressable key={k} onPress={() => router.navigate({ pathname: '/tickets', params: { status: f, ts: String(Date.now()) } } as never)}
            accessibilityRole="button" accessibilityLabel={`${k}: ${v ?? 0}. Ver tickets`}
            style={({ pressed }) => ({ flex: 1, backgroundColor: c.card, borderColor: k === 'Vencidos' && Number(v) > 0 ? c.danger + '88' : c.line, borderWidth: 1, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', opacity: pressed ? 0.8 : 1 })}>
            <Text style={{ color: k === 'Vencidos' && Number(v) > 0 ? c.danger : c.ink, fontSize: 22, fontWeight: '800' }}>{v ?? 0}</Text>
            <Text style={{ color: c.muted, fontSize: 10.5, fontWeight: '700' }}>{k}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
        {actions.filter(a => a.show).map(a => (
          <Pressable key={a.label} onPress={a.go} style={{ flex: 1, backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: 16, paddingVertical: 12, alignItems: 'center', gap: 6 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name={a.icon} size={19} color={c.accent} /></View>
            <Text style={{ color: c.ink, fontSize: 11.5, fontWeight: '800', textAlign: 'center' }}>{a.label}</Text>
          </Pressable>
        ))}
      </View>

      <H>Gestión</H>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
        {([
          ['wallet', me?.role === 'Técnico' ? 'Mi desempeño' : 'Desempeño y nómina', '/performance', true],
          ['tag', 'Catálogo', '/catalog', true],
          ['quote', 'Cotizaciones', '/quotes', me?.role !== 'Técnico'],
          ['chart', 'Estadísticas', '/stats', me?.role !== 'Técnico'],
        ] as [IconName, string, string, boolean][]).filter(a => a[3]).map(([i, l, path]) => (
          <Pressable key={l} onPress={() => router.push(path as never)} style={{ width: '48.5%', flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: 14, padding: 12 }}>
            <Icon name={i} size={18} color={c.accent} /><Text style={{ color: c.ink, fontWeight: '800', fontSize: 12.5, flex: 1 }}>{l}</Text>
          </Pressable>
        ))}
      </View>

      {isAdmin ? (
        <>
          <H>Administración</H>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {([['users', 'Usuarios', '/admin/users'], ['building', 'Empresas', '/admin/companies'], ['route', 'Asignar', '/admin/assignments']] as [IconName, string, string][]).map(([i, l, p]) => (
              <Pressable key={l} onPress={() => router.push(p as never)} style={{ flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: 14, padding: 12 }}>
                <Icon name={i} size={18} color={c.accent} /><Text style={{ color: c.ink, fontWeight: '800', fontSize: 12.5 }}>{l}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      <H right={<Pressable onPress={() => router.push('/tickets')}><Text style={{ color: c.accent, fontWeight: '800', fontSize: 13 }}>Ver todos</Text></Pressable>}>
        {isStaff ? 'En curso' : 'Mis tickets recientes'}
      </H>
      {byUrgency.slice(0, 5).map(t => <TicketCard key={t.id} t={t} compact />)}
      {!loading && !byUrgency.length && !error ? <Muted>No hay tickets en curso.</Muted> : null}
    </Screen>
  );
}
