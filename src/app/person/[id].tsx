import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { api } from '../../api/client';
import { useAuth } from '../../auth';
import { Avatar, Btn, Card, ErrorBox, Field, H, IdChip, Loading, Muted, notify, Pill, Row, Screen, priorityTone, statusTone } from '../../components/kit';
import { fmtDate } from '../../lib/format';
import { useTheme } from '../../theme';

type P = {
  id: number; name: string; email: string; phone?: string | null; area?: string | null; level: 'full' | 'staff' | 'contact';
  role?: string; position?: string | null; tech_code?: string | null; specialties?: string | null; bio?: string | null; company?: string | null; active?: boolean;
  document_id?: string | null; birth_date?: string | null; hire_date?: string | null; city?: string | null; address?: string | null; emergency_name?: string | null; emergency_phone?: string | null;
  stats?: { abiertos: number; resueltos: number; total: number };
  tickets?: { id: number; title: string; status: string; priority: string; created_at: string }[];
};

function KV({ k, v }: { k: string; v?: string | null }) {
  const { c } = useTheme();
  return <View style={{ flexDirection: 'row', paddingVertical: 5, gap: 10 }}><Text style={{ color: c.muted, width: 118, fontSize: 12.5 }}>{k}</Text><Text selectable style={{ color: c.ink, flex: 1, fontWeight: '600', fontSize: 13 }}>{v || '—'}</Text></View>;
}

export default function Person() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [p, setP] = useState<P | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { me, isAdmin } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<Record<string, string>>({});
  const set = (k: string) => (v: string) => setF(o => ({ ...o, [k]: v }));

  function startEdit() {
    if (!p) return;
    setF({
      name: p.name ?? '', email: p.email ?? '', area: p.area ?? '', phone: p.phone ?? '', position: p.position ?? '', specialties: p.specialties ?? '', bio: p.bio ?? '',
      document_id: p.document_id ?? '', birth_date: p.birth_date ?? '', hire_date: p.hire_date ?? '', city: p.city ?? '', address: p.address ?? '',
      emergency_name: p.emergency_name ?? '', emergency_phone: p.emergency_phone ?? '',
    });
    setEditing(true);
  }

  async function saveEdit() {
    if (!p) return;
    setSaving(true);
    try {
      // el administrador cambia además nombre, correo, área y cargo; cada persona edita su propio contacto
      const body: Record<string, string> = { ...f };
      if (!isAdmin) { delete body.name; delete body.email; delete body.area; delete body.position; }
      await api(`/profiles/${p.id}/edit`, { method: 'POST', body });
      setEditing(false); notify('Información actualizada.'); await load();
    } catch (e: unknown) { notify(e instanceof Error ? e.message : 'No se pudo guardar.'); }
    finally { setSaving(false); }
  }

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setP(await api<P>(`/profiles/${id}`)); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'No se pudo cargar el perfil.'); }
    finally { setLoading(false); }
  }, [id]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <Screen back title={p?.name ?? 'Perfil'} eyebrow={p?.role === 'Usuario' ? 'Cliente' : p?.role ?? 'Perfil'} refreshing={loading && !!p} onRefresh={load}>
      {loading && !p ? <Loading /> : null}
      <ErrorBox message={error} onRetry={load} />
      {p ? (
        <>
          <Card style={{ alignItems: 'center', paddingVertical: 20 }}>
            <Avatar name={p.name} size={72} />
            <Text style={{ color: c.ink, fontSize: 20, fontWeight: '800', marginTop: 10, textAlign: 'center' }}>{p.name}</Text>
            <Muted>{[p.position, p.area, p.company].filter(Boolean).join(' · ')}</Muted>
            <View style={{ marginTop: 8, flexDirection: 'row', gap: 8, alignItems: 'center' }}><IdChip code={p.tech_code} />{p.active === false ? <Pill text="Deshabilitado" tone="danger" /> : null}</View>
            <Row style={{ marginTop: 14 }}>
              {p.phone ? <Btn title="Llamar" icon="phone" style={{ flex: 1 }} onPress={() => { void Linking.openURL(`tel:${p.phone}`); }} /> : null}
              <Btn title="Correo" icon="mail" variant="ghost" style={{ flex: 1 }} onPress={() => { void Linking.openURL(`mailto:${p.email}`); }} />
            </Row>
          </Card>

          {p.stats ? (
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 11 }}>
              {[['En curso', p.stats.abiertos], ['Resueltos', p.stats.resueltos], ['Total', p.stats.total]].map(([k, v]) => (
                <View key={String(k)} style={{ flex: 1, backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: 14, padding: 10, alignItems: 'center' }}>
                  <Text style={{ color: c.ink, fontSize: 22, fontWeight: '800' }}>{v}</Text><Text style={{ color: c.muted, fontSize: 11, fontWeight: '700' }}>{k}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {p.level === 'full' && (isAdmin || me?.id === p.id) ? (
            editing ? (
              <>
                <H>Editar información</H>
                <Card>
                  {isAdmin ? <><Field label="Nombre completo" value={f.name} onChangeText={set('name')} /><Field label="Correo electrónico" value={f.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" /><Field label="Área" value={f.area} onChangeText={set('area')} /><Field label="Cargo" value={f.position} onChangeText={set('position')} /></> : null}
                  <Field label="Teléfono" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
                  <Field label="Especialidades" value={f.specialties} onChangeText={set('specialties')} />
                  <Field label="Acerca de" value={f.bio} onChangeText={set('bio')} multiline />
                  <Field label="Documento" value={f.document_id} onChangeText={set('document_id')} />
                  <Field label="Nacimiento (AAAA-MM-DD)" value={f.birth_date} onChangeText={set('birth_date')} />
                  <Field label="Ingreso (AAAA-MM-DD)" value={f.hire_date} onChangeText={set('hire_date')} />
                  <Field label="Ciudad" value={f.city} onChangeText={set('city')} />
                  <Field label="Dirección" value={f.address} onChangeText={set('address')} />
                  <Field label="Contacto de emergencia" value={f.emergency_name} onChangeText={set('emergency_name')} />
                  <Field label="Teléfono de emergencia" value={f.emergency_phone} onChangeText={set('emergency_phone')} keyboardType="phone-pad" />
                  <Row>
                    <Btn title="Guardar" icon="check" loading={saving} style={{ flex: 1 }} onPress={saveEdit} />
                    <Btn title="Cancelar" variant="ghost" style={{ flex: 1 }} onPress={() => setEditing(false)} />
                  </Row>
                </Card>
              </>
            ) : <Btn title="Editar información" icon="user" variant="soft" style={{ marginBottom: 12 }} onPress={startEdit} />
          ) : null}

          <H>Contacto</H>
          <Card>
            <KV k="Nombre" v={p.name} /><KV k="Correo" v={p.email} /><KV k="Teléfono" v={p.phone} /><KV k="Área" v={p.area} />
            {p.level !== 'contact' ? <><KV k="Cargo" v={p.position} /><KV k="Especialidades" v={p.specialties} /><KV k="Acerca de" v={p.bio} /></> : null}
          </Card>
          {p.level === 'contact' ? <Muted style={{ marginBottom: 10 }}>Por privacidad solo se muestran los datos de contacto necesarios.</Muted> : null}

          {p.level === 'full' ? (
            <>
              <H right={<Pill text="🔒 Privado" tone="warn" />}>Datos personales</H>
              <Card>
                <KV k="Documento" v={p.document_id} /><KV k="Nacimiento" v={p.birth_date} /><KV k="Ingreso" v={p.hire_date} /><KV k="Ciudad" v={p.city} /><KV k="Dirección" v={p.address} />
                <KV k="Emergencia" v={[p.emergency_name, p.emergency_phone].filter(Boolean).join(' · ')} />
              </Card>
              <Muted>Solo tú y el administrador ven estos datos.</Muted>
            </>
          ) : null}

          {p.tickets?.length ? (
            <>
              <H>Últimos tickets asignados</H>
              {p.tickets.map(t => (
                <Card key={t.id} onPress={() => router.push(`/ticket/${t.id}`)} style={{ padding: 12 }}>
                  <Row style={{ justifyContent: 'space-between' }}><Text numberOfLines={1} style={{ color: c.ink, fontWeight: '700', flex: 1 }}>{t.title}</Text><Pill text={t.priority} tone={priorityTone(t.priority)} /></Row>
                  <Row style={{ marginTop: 6, justifyContent: 'space-between' }}><Pill text={t.status} tone={statusTone(t.status)} /><Muted style={{ fontSize: 11 }}>{fmtDate(t.created_at)}</Muted></Row>
                </Card>
              ))}
            </>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
