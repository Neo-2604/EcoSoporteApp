import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, AuthError, setToken } from '../api/client';

type Ticket = {
  id: number;
  code?: string;
  title: string;
  priority?: string;
  status?: string;
  company?: string | null;
};

type Me = {
  id?: number;
  name: string;
  email?: string;
  role: string;
  area?: string;
};

type Counts = Record<string, number>;

const C = {
  ink: '#123F4B',
  muted: '#68848C',
  bg: '#F2FAF9',
  line: '#DCEeed',
  card: '#FFFFFF',
  teal: '#00A88F',
  tealDark: '#008A78',
  red: '#BD3232',
};

type Shortcut = {
  title: string;
  description: string;
  path: '/admin/users' | '/admin/companies' | '/admin/assignments' | '/tickets' | '/new-ticket';
};

const ADMIN_OPTIONS: Shortcut[] = [
  {
    title: 'Administrar usuarios',
    description: 'Crear, editar y activar o desactivar cuentas.',
    path: '/admin/users',
  },
  {
    title: 'Empresas registradas',
    description: 'Consultar y registrar empresas clientes.',
    path: '/admin/companies',
  },
  {
    title: 'Asignación de técnicos',
    description: 'Gestionar la asignación de solicitudes.',
    path: '/admin/assignments',
  },
  {
    title: 'Todos los tickets',
    description: 'Consultar las solicitudes disponibles para tu rol.',
    path: '/tickets',
  },
];

const ROLE_OPTIONS: Record<string, Shortcut[]> = {
  'Soporte TI': [
    {
      title: 'Tickets de soporte',
      description: 'Consultar y hacer seguimiento a solicitudes.',
      path: '/tickets',
    },
    {
      title: 'Empresas registradas',
      description: 'Consultar empresas según tus permisos.',
      path: '/admin/companies',
    },
    {
      title: 'Crear solicitud',
      description: 'Registrar una nueva solicitud de soporte.',
      path: '/new-ticket',
    },
  ],
  Técnico: [
    {
      title: 'Mis tickets',
      description: 'Consultar las solicitudes disponibles para tu cuenta.',
      path: '/tickets',
    },
  ],
  Usuario: [
    {
      title: 'Crear solicitud',
      description: 'Reportar un problema o requerir asistencia.',
      path: '/new-ticket',
    },
    {
      title: 'Mis solicitudes',
      description: 'Consultar el estado de tus tickets.',
      path: '/tickets',
    },
  ],
};

const PRIORITY_COLORS: Record<string, { bg: string; fg: string }> = {
  Crítica: { bg: '#FFE5E5', fg: '#BD3232' },
  Alta: { bg: '#FFF0DF', fg: '#A96005' },
  Media: { bg: '#FFF7D9', fg: '#8E7500' },
  Baja: { bg: '#E5F8EC', fg: '#24814B' },
};

export default function Dashboard() {
  const insets = useSafeAreaInsets();

  const [me, setMe] = useState<Me | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [counts, setCounts] = useState<Counts>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [user, ticketData, dashboardData] = await Promise.all([
        api<Me>('/me'),
        api<Ticket[]>('/tickets'),
        api<{ counts?: Counts }>('/dashboard'),
      ]);

      setMe(user);
      setTickets(ticketData);
      setCounts(dashboardData.counts ?? {});
    } catch (e: unknown) {
      if (
        e instanceof AuthError ||
        (e instanceof Error &&
          /No autenticado|Sesión vencida|Cuenta inactiva/i.test(e.message))
      ) {
        await setToken(null);
        router.replace('/login');
      } else {
        setError(
          e instanceof Error
            ? e.message
            : 'No se pudo cargar la información del panel.'
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function logout() {
    await setToken(null);
    router.replace('/login');
  }

  const role = me?.role ?? '';
  const options =
    role === 'Administrador'
      ? ADMIN_OPTIONS
      : ROLE_OPTIONS[role] ?? ROLE_OPTIONS.Usuario;

  const summary = [
    { title: 'Abiertos', value: counts['Abierto'] ?? 0 },
    { title: 'En proceso', value: counts['En proceso'] ?? 0 },
    { title: 'Resueltos', value: counts['Resuelto'] ?? 0 },
    { title: 'Tickets visibles', value: tickets.length },
  ];

  if (loading && !me) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: C.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image
          source={require('../../assets/images/logo-completo.png')}
          resizeMode="contain"
          style={{ width: 240, height: 180, marginBottom: 20 }}
        />
        <ActivityIndicator size="large" color={C.teal} />
        <Text style={{ color: C.muted, marginTop: 12 }}>
          Cargando EcoSoporte Digital...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{
        paddingHorizontal: 18,
        paddingTop: Math.max(insets.top, 20) + 8,
        paddingBottom: Math.max(insets.bottom, 20) + 24,
      }}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} />
      }
    >
      <View
        style={{
          paddingBottom: 12,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderColor: C.line,
          marginBottom: 22,
        }}
      >
        <Image
          source={require('../../assets/images/logo-letras.png')}
          resizeMode="contain"
          style={{ width: 230, height: 58 }}
        />

        <Pressable
          onPress={logout}
          accessibilityRole="button"
          style={{
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: C.line,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          <Text style={{ color: C.red, fontWeight: '800' }}>
            Cerrar sesión
          </Text>
        </Pressable>
      </View>

      <View style={{ marginBottom: 22 }}>
        <Text
          style={{
            fontSize: 27,
            fontWeight: '900',
            color: C.ink,
          }}
        >
          Hola, {me?.name?.split(' ')[0] ?? 'bienvenido'}
        </Text>

        <Text style={{ color: C.muted, fontSize: 16, marginTop: 4 }}>
          {role || 'Usuario'}{me?.area ? ` · ${me.area}` : ''}
        </Text>

        <Text style={{ color: C.muted, lineHeight: 21, marginTop: 8 }}>
          Bienvenido al centro de soporte TI. Gestiona las solicitudes de
          acuerdo con los permisos de tu cuenta.
        </Text>
      </View>

      {error ? (
        <View
          style={{
            backgroundColor: '#FFF0F0',
            borderRadius: 12,
            padding: 14,
            marginBottom: 18,
          }}
        >
          <Text style={{ color: C.red }}>{error}</Text>
          <Pressable onPress={load} style={{ paddingTop: 12 }}>
            <Text style={{ color: C.tealDark, fontWeight: '800' }}>
              Reintentar
            </Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        onPress={() => router.push('/new-ticket')}
        accessibilityRole="button"
        style={{
          backgroundColor: C.teal,
          borderRadius: 15,
          padding: 17,
          marginBottom: 24,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '900' }}>
          + Crear nuevo ticket
        </Text>
        <Text style={{ color: '#E7FFFA', marginTop: 5 }}>
          Registra una solicitud de soporte técnico.
        </Text>
      </Pressable>

      <Text
        style={{
          color: C.ink,
          fontSize: 20,
          fontWeight: '900',
          marginBottom: 12,
        }}
      >
        Resumen de solicitudes
      </Text>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginHorizontal: -4,
          marginBottom: 24,
        }}
      >
        {summary.map((item) => (
          <View
            key={item.title}
            style={{
              width: '48%',
              flexGrow: 1,
              backgroundColor: C.card,
              borderWidth: 1,
              borderColor: C.line,
              borderRadius: 14,
              padding: 15,
              margin: 4,
            }}
          >
            <Text style={{ color: C.muted, fontSize: 12 }}>
              {item.title}
            </Text>
            <Text
              style={{
                color: C.ink,
                fontSize: 27,
                fontWeight: '900',
                marginTop: 6,
              }}
            >
              {item.value}
            </Text>
          </View>
        ))}
      </View>

      <Text
        style={{
          color: C.ink,
          fontSize: 20,
          fontWeight: '900',
          marginBottom: 12,
        }}
      >
        {role === 'Administrador'
          ? 'Administración'
          : 'Accesos de tu cuenta'}
      </Text>

      {options.map((item) => (
        <Pressable
          key={item.path}
          onPress={() => router.push(item.path as any)}
          accessibilityRole="button"
          style={{
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.line,
            borderRadius: 15,
            padding: 17,
            marginBottom: 11,
          }}
        >
          <Text
            style={{
              color: C.ink,
              fontSize: 16,
              fontWeight: '900',
            }}
          >
            {item.title}  ›
          </Text>
          <Text style={{ color: C.muted, marginTop: 6, lineHeight: 20 }}>
            {item.description}
          </Text>
        </Pressable>
      ))}

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 15,
          marginBottom: 12,
        }}
      >
        <Text style={{ color: C.ink, fontSize: 20, fontWeight: '900' }}>
          Tickets recientes
        </Text>

        <Pressable onPress={() => router.push('/tickets')}>
          <Text style={{ color: C.tealDark, fontWeight: '800' }}>
            Ver todos
          </Text>
        </Pressable>
      </View>

      {tickets.length === 0 ? (
        <View
          style={{
            backgroundColor: C.card,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: C.line,
            padding: 20,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: C.muted }}>
            {loading
              ? 'Cargando solicitudes...'
              : 'No hay tickets para mostrar.'}
          </Text>
        </View>
      ) : (
        tickets.slice(0, 5).map((ticket) => {
          const priority =
            PRIORITY_COLORS[ticket.priority ?? 'Media'] ??
            PRIORITY_COLORS.Media;

          return (
            <Pressable
              key={ticket.id}
              onPress={() => router.push(`/ticket/${ticket.id}`)}
              style={{
                backgroundColor: C.card,
                borderWidth: 1,
                borderColor: C.line,
                borderRadius: 15,
                padding: 16,
                marginBottom: 11,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <Text style={{ color: C.muted, fontSize: 12 }}>
                  {ticket.code ?? `#${ticket.id}`} · {ticket.status ?? 'Sin estado'}
                </Text>

                <View
                  style={{
                    backgroundColor: priority.bg,
                    borderRadius: 20,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                  }}
                >
                  <Text
                    style={{
                      color: priority.fg,
                      fontSize: 11,
                      fontWeight: '900',
                    }}
                  >
                    {ticket.priority ?? 'Media'}
                  </Text>
                </View>
              </View>

              <Text
                style={{
                  color: C.ink,
                  fontSize: 16,
                  fontWeight: '900',
                  marginTop: 9,
                }}
              >
                {ticket.title}
              </Text>

              <Text style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>
                {ticket.company ?? 'Sin empresa vinculada'}
              </Text>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}