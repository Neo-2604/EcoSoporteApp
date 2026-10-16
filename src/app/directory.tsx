import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { api } from '../api/client';
import { Avatar, Card, Chips, Empty, ErrorBox, Field, IdChip, Loading, Muted, Row, Screen } from '../components/kit';
import { Icon } from '../components/icon';
import { useTheme } from '../theme';

type Contact = { id: number; name: string; email: string; phone?: string | null; role: string; area?: string | null; position?: string | null; company?: string | null; tech_code?: string | null };
const ROLES = ['Administrador', 'Soporte TI', 'Técnico', 'Usuario'] as const;

export default function Directory() {
  const { c } = useTheme();
  const [rows, setRows] = useState<Contact[]>([]);
  const [clientView, setClientView] = useState(false);
  const [q, setQ] = useState('');
  const [role, setRole] = useState<(typeof ROLES)[number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const d = await api<{ contacts: Contact[]; client_view: boolean }>('/directory'); setRows(d.contacts); setClientView(d.client_view); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'No se pudo cargar el directorio.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const ql = q.trim().toLowerCase();
  const list = rows.filter(r => (!role || r.role === role) && (!ql || [r.name, r.email, r.company, r.phone, r.area, r.tech_code].join(' ').toLowerCase().includes(ql)));

  return (
    <Screen back title={clientView ? 'Mis técnicos' : 'Directorio'} eyebrow="Contactos" refreshing={loading && !!rows.length} onRefresh={load}>
      <Field value={q} onChangeText={setQ} placeholder="Buscar nombre, correo, empresa, ID…" autoCapitalize="none" />
      {!clientView ? <Chips options={ROLES} value={role} onChange={setRole} all="Todos" label={r => (r === 'Usuario' ? 'Clientes' : r)} /> : null}
      <ErrorBox message={error} onRetry={load} />
      {loading && !rows.length ? <Loading /> : null}
      {!loading && !error && !list.length ? <Empty text={clientView ? 'Todavía no tienes técnicos asignados.' : 'No hay contactos que coincidan.'} /> : null}
      {list.map(r => (
        <Card key={`${r.id}-${r.email}`} onPress={() => router.push(`/person/${r.id}`)} style={{ padding: 13 }}>
          <Row>
            <Avatar name={r.name} size={42} tone="soft" />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: c.ink, fontWeight: '800' }}>{r.name}</Text>
              <Muted>{r.role === 'Usuario' ? 'Cliente' : r.role}{r.area ? ` · ${r.area}` : ''}</Muted>
              <Muted>{r.company ?? 'EcoSoporte Digital'}</Muted>
              <IdChip code={r.tech_code} />
            </View>
            {r.phone ? <Pressable onPress={() => { void Linking.openURL(`tel:${r.phone}`); }} accessibilityLabel="Llamar" hitSlop={8} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name="phone" size={18} color={c.accent} /></Pressable> : null}
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
