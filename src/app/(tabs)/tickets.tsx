import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api } from '../../api/client';
import { Chips, Empty, ErrorBox, Field, Loading, Screen } from '../../components/kit';
import { Icon } from '../../components/icon';
import { Ticket, TicketCard } from '../../components/ticket-card';
import { useTheme } from '../../theme';

const FILTERS = ['Abierto', 'En proceso', 'En espera', 'Finalizados'] as const;

export default function Tickets() {
  const { c } = useTheme();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<(typeof FILTERS)[number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const seq = useRef(0);

  const load = useCallback(async () => {
    const my = ++seq.current;
    setLoading(true); setError('');
    try {
      const qs = new URLSearchParams(); if (q.trim()) qs.set('q', q.trim()); if (status) qs.set('status', status === 'Finalizados' ? 'finalizados' : status);
      const data = await api<Ticket[]>(`/tickets${qs.toString() ? '?' + qs : ''}`);
      if (my === seq.current) setTickets(data);
    } catch (e: unknown) {
      if (my === seq.current) setError(e instanceof Error ? e.message : 'No se pudieron cargar los tickets.');
    } finally { if (my === seq.current) setLoading(false); }
  }, [q, status]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => { const t = setTimeout(() => { void load(); }, 350); return () => clearTimeout(t); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Screen tabs title="Tickets" eyebrow="Mesa de servicio" refreshing={loading && tickets.length > 0} onRefresh={load}
      right={<Pressable onPress={() => router.push('/new-ticket')} accessibilityLabel="Nuevo ticket" style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={22} color={c.accentInk} stroke={2.4} /></Pressable>}>
      <Field value={q} onChangeText={setQ} placeholder="Buscar por título o código (TCK-…)" autoCapitalize="none" returnKeyType="search" />
      <Chips options={FILTERS} value={status} onChange={setStatus} all="Todos" />
      <ErrorBox message={error} onRetry={load} />
      {loading && !tickets.length ? <Loading /> : null}
      {!loading && !error && !tickets.length ? <Empty text="No hay tickets para mostrar." /> : null}
      {tickets.map((t, i) => (
        <View key={t.id}>
          {t.year && (i === 0 || tickets[i - 1].year !== t.year) ? <Text style={{ color: c.muted, fontWeight: '800', fontSize: 12, letterSpacing: 1, marginBottom: 8, marginTop: i ? 6 : 0 }}>AÑO {t.year}</Text> : null}
          <TicketCard t={t} />
        </View>
      ))}
    </Screen>
  );
}
