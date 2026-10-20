import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { api } from '../../api/client';
import { useAuth } from '../../auth';
import { Avatar, Btn, Card, confirm, ErrorBox, Field, H, IdChip, Muted, notify, Pill, Row, Screen } from '../../components/kit';
import { Icon, IconName } from '../../components/icon';
import { Mode, useTheme } from '../../theme';

const MODES: [Mode, string, IconName][] = [['system', 'Sistema', 'device'], ['light', 'Claro', 'sun'], ['dark', 'Oscuro', 'moon']];

export default function Profile() {
  const { c, mode, setMode } = useTheme();
  const { me, signOut } = useAuth();
  const [info, setInfo] = useState<{ download_url: string | null; version: string | null } | null>(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [cur, setCur] = useState(''); const [nw, setNw] = useState(''); const [rep, setRep] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');

  useEffect(() => { api<{ download_url: string | null; version: string | null }>('/app-info').then(setInfo).catch(() => {}); }, []);

  async function changePassword() {
    setError('');
    if (nw.length < 10) { setError('La nueva contraseña debe tener al menos 10 caracteres.'); return; }
    if (nw !== rep) { setError('La confirmación no coincide.'); return; }
    setBusy(true);
    try {
      await api('/me/password', { method: 'POST', body: { current: cur, new: nw } });
      setCur(''); setNw(''); setRep(''); setPwOpen(false); notify('Contraseña actualizada.');
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'No se pudo cambiar la contraseña.'); }
    finally { setBusy(false); }
  }

  const installed = Constants.expoConfig?.version ?? '1.0.0';
  const newer = !!info?.version && info.version !== installed;

  return (
    <Screen tabs title="Perfil" eyebrow="Mi cuenta">
      <Card style={{ padding: 16 }}>
        <Row style={{ gap: 14 }}>
          <Avatar name={me?.name ?? '?'} size={58} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: c.ink, fontSize: 18, fontWeight: '800' }}>{me?.name}</Text>
            <Muted>{me?.role === 'Usuario' ? 'Cliente' : me?.role}{me?.area ? ` · ${me.area}` : ''}</Muted>
            <IdChip code={me?.tech_code} />
          </View>
        </Row>
        <Muted style={{ marginTop: 10 }}>{me?.email}</Muted>
        {me && me.role !== 'Usuario' ? <Btn title="Mi perfil" variant="soft" icon="id" style={{ marginTop: 12 }} onPress={() => router.push(`/person/${me.id}`)} /> : null}
      </Card>

      <H>Apariencia</H>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 11 }}>
        {MODES.map(([m, label, icon]) => {
          const on = mode === m;
          return (
            <Pressable key={m} onPress={() => setMode(m)} accessibilityRole="radio" accessibilityState={{ selected: on }}
              style={{ flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: 16, backgroundColor: on ? c.accentSoft : c.card, borderWidth: 1.5, borderColor: on ? c.accent : c.line }}>
              <Icon name={icon} size={22} color={on ? c.accent : c.muted} />
              <Text style={{ color: on ? c.accent : c.muted, fontWeight: '800', fontSize: 12.5 }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <H>Cuenta</H>
      <Card onPress={() => setPwOpen(!pwOpen)} style={{ padding: 14, marginBottom: pwOpen ? 0 : 11, borderBottomLeftRadius: pwOpen ? 0 : 18, borderBottomRightRadius: pwOpen ? 0 : 18 }}><Row><Icon name="lock" size={20} color={c.accent} /><Text style={{ color: c.ink, fontWeight: '700', flex: 1 }}>Cambiar contraseña</Text><Icon name="chevron" size={18} color={c.muted} /></Row></Card>
      {pwOpen ? (
        <Card style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTopWidth: 0 }}>
          <ErrorBox message={error} />
          <Field label="Contraseña actual" value={cur} onChangeText={setCur} secureTextEntry autoCapitalize="none" />
          <Field label="Nueva contraseña (mín. 10)" value={nw} onChangeText={setNw} secureTextEntry autoCapitalize="none" />
          <Field label="Repetir nueva contraseña" value={rep} onChangeText={setRep} secureTextEntry autoCapitalize="none" />
          <Btn title="Guardar contraseña" loading={busy} onPress={changePassword} />
        </Card>
      ) : null}

      <H>Aplicación</H>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}><Text style={{ color: c.ink, fontWeight: '700' }}>Versión instalada</Text><Pill text={installed} /></Row>
        {newer ? (
          <>
            <Muted style={{ marginTop: 8 }}>Hay una versión nueva disponible ({info?.version}).</Muted>
            {info?.download_url ? <Btn title="Descargar actualización" icon="download" style={{ marginTop: 10 }} onPress={() => { void Linking.openURL(info.download_url!); }} /> : null}
          </>
        ) : <Muted style={{ marginTop: 8 }}>Tienes la versión más reciente.</Muted>}
      </Card>

      <Btn title="Cerrar sesión" variant="danger" icon="logout" style={{ marginTop: 6 }} onPress={() => confirm('¿Cerrar la sesión en este dispositivo?', () => { void signOut(); }, 'Cerrar sesión')} />
    </Screen>
  );
}
