import { Redirect, useFocusEffect } from 'expo-router';
import { useAuth } from '../../auth';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api } from '../../api/client';
import { Avatar, Card, Empty, ErrorBox, H, Loading, Muted, Pill, Row, Screen } from '../../components/kit';
import { ago } from '../../lib/format';
import { useTheme } from '../../theme';

type Activity = {
  online_total: number; online_app: number; online_web: number; online_anonymous: number;
  online_users: { name: string; role: string; kind: string; path?: string; last_seen: string }[];
  today_views: number; today_visitors: number;
  days: { day: string; views: number; visitors: number }[];
  top_pages: { path: string; n: number }[];
  last_users: { name: string; role: string; last_seen: string; sessions: number }[];
};
type Lead = { id: number; status: string; kind: string; name?: string | null; subject?: string | null };

const roleLabel = (r: string) => (r === 'Usuario' ? 'Cliente' : r);

export default function Live() {
  const { isAdmin } = useAuth();
  return isAdmin ? <LiveInner /> : <Redirect href="/" />; // los técnicos no ven esta sección
}

function LiveInner() {
  const { c } = useTheme();
  const [a, setA] = useState<Activity | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [act, l] = await Promise.all([api<Activity>('/activity'), api<Lead[]>('/leads').catch(() => [] as Lead[])]);
      setA(act); setLeads(l);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'No se pudo cargar la actividad.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => {
    void load();
    const t = setInterval(() => { void load(); }, 30000); // se refresca solo cada 30 s
    return () => clearInterval(t);
  }, [load]));

  const max = Math.max(1, ...(a?.days.map(d => d.views) ?? [1]));
  const nuevos = leads.filter(l => l.status === 'Nuevo').length;

  return (
    <Screen tabs title="En vivo" eyebrow="Administración" refreshing={loading && !!a} onRefresh={load}>
      <ErrorBox message={error} onRetry={load} />
      {loading && !a ? <Loading /> : null}
      {a ? (
        <>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 11 }}>
            <Card style={{ flex: 1, marginBottom: 0 }}>
              <Row style={{ gap: 6 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent }} /><Muted>Conectados ahora</Muted></Row>
              <Text style={{ color: c.ink, fontSize: 32, fontWeight: '800' }}>{a.online_total}</Text>
              <Muted>{a.online_app} en la app · {a.online_web} en la web</Muted>
            </Card>
            <Card style={{ flex: 1, marginBottom: 0 }}>
              <Muted>Visitas hoy</Muted>
              <Text style={{ color: c.ink, fontSize: 32, fontWeight: '800' }}>{a.today_views}</Text>
              <Muted>{a.today_visitors} visitantes</Muted>
            </Card>
          </View>

          <Card>
            <Row style={{ justifyContent: 'space-between' }}><Text style={{ color: c.ink, fontWeight: '800' }}>Visitas (7 días)</Text><Muted>web y app</Muted></Row>
            <View style={{ height: 90, flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 12 }}>
              {a.days.map((d, i) => (
                <View key={d.day} style={{ flex: 1, alignItems: 'center' }}>
                  <View style={{ width: '100%', height: Math.max(4, (d.views / max) * 76), borderTopLeftRadius: 5, borderTopRightRadius: 5, backgroundColor: i === a.days.length - 1 ? c.accent : c.line }} />
                  <Text style={{ color: c.muted, fontSize: 9.5, marginTop: 3 }}>{d.day.slice(8)}</Text>
                </View>
              ))}
            </View>
          </Card>

          <H>Activos ahora</H>
          {a.online_users.map((u, i) => (
            <Card key={i} style={{ padding: 14 }}>
              <Row style={{ gap: 12, alignItems: 'flex-start' }}>
                <View>
                  <Avatar name={u.name} size={44} />
                  <View style={{ position: 'absolute', right: -1, bottom: -1, width: 13, height: 13, borderRadius: 7, backgroundColor: c.ok, borderWidth: 2, borderColor: c.card }} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text numberOfLines={2} style={{ color: c.ink, fontWeight: '800', fontSize: 15 }}>{u.name}</Text>
                  <Muted>{roleLabel(u.role)}</Muted>
                </View>
                <Pill text="En línea" tone="ok" />
              </Row>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                <Pill text={u.kind === 'app' ? 'App' : 'Web'} />
                {u.path ? <Pill text={u.path} /> : null}
                <Muted style={{ alignSelf: 'center' }}>· activo {ago(u.last_seen)}</Muted>
              </View>
            </Card>
          ))}
          {a.online_anonymous ? <Muted style={{ marginBottom: 8 }}>+ {a.online_anonymous} visitante(s) sin sesión (web pública)</Muted> : null}
          {!a.online_users.length && !a.online_anonymous ? <Empty text="Nadie conectado en este momento." /> : null}

          {nuevos ? (
            <Pressable onPress={() => load()}>
              <Card tone="accent"><Row style={{ justifyContent: 'space-between' }}><View style={{ flex: 1 }}><Text style={{ color: c.ink, fontWeight: '800' }}>{nuevos} solicitud(es) nueva(s) del asistente</Text><Muted>Venta de componentes y servicios · revísalas en la web (Solicitudes del chat)</Muted></View></Row></Card>
            </Pressable>
          ) : null}

          <H>Últimos usuarios</H>
          {a.last_users.slice(0, 6).map((u, i) => (
            <Card key={i} style={{ padding: 14 }}>
              <Row style={{ gap: 12, alignItems: 'flex-start' }}>
                <Avatar name={u.name} size={44} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text numberOfLines={2} style={{ color: c.ink, fontWeight: '800', fontSize: 15 }}>{u.name}</Text>
                  <Muted>{roleLabel(u.role)}</Muted>
                </View>
                <Pill text={ago(u.last_seen)} />
              </Row>
              <Muted style={{ marginTop: 8 }}>Última conexión {ago(u.last_seen)}{u.sessions ? ` · ${u.sessions} ${u.sessions === 1 ? 'sesión' : 'sesiones'}` : ''}</Muted>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
