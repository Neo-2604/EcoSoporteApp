
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { api } from '../api/client';

type Ticket = {
  id: number;
  code?: string;
  year?: number;
  title: string;
  status?: string;
  priority?: string;
  company?: string | null;
};

const C = {
  teal: '#00A88F',
  dark: '#123F4B',
  muted: '#68848C',
  bg: '#F3FAF9',
  white: '#FFFFFF',
  line: '#D9EAE8',
  red: '#B93838',
};

export default function TicketsScreen() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await api<Ticket[]>('/tickets');
      setTickets(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'No se pudieron cargar los tickets.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTickets();
    }, [loadTickets])
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadTickets} />
      }
    >
      <Pressable onPress={() => router.replace('/')} style={{ marginBottom: 22 }}>
        <Text style={{ color: C.teal, fontWeight: '800' }}>
          ‹ Volver al inicio
        </Text>
      </Pressable>

      <Text style={{ color: C.dark, fontSize: 28, fontWeight: '900' }}>
        Tickets de soporte
      </Text>

      <Text style={{ color: C.muted, marginTop: 6, marginBottom: 20 }}>
        Consulta las solicitudes disponibles para tu cuenta.
      </Text>

      <Pressable
        onPress={() => router.push('/new-ticket')}
        style={{
          backgroundColor: C.teal,
          borderRadius: 12,
          padding: 15,
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <Text style={{ color: C.white, fontWeight: '900' }}>
          + Crear ticket
        </Text>
      </Pressable>

      {loading && tickets.length === 0 ? (
        <ActivityIndicator size="large" color={C.teal} />
      ) : error ? (
        <View style={{ backgroundColor: C.white, padding: 16, borderRadius: 14 }}>
          <Text style={{ color: C.red }}>{error}</Text>
          <Pressable onPress={loadTickets} style={{ marginTop: 12 }}>
            <Text style={{ color: C.teal, fontWeight: '800' }}>
              Intentar de nuevo
            </Text>
          </Pressable>
        </View>
      ) : tickets.length === 0 ? (
        <View style={{ backgroundColor: C.white, padding: 20, borderRadius: 14 }}>
          <Text style={{ color: C.muted, textAlign: 'center' }}>
            No hay tickets para mostrar.
          </Text>
        </View>
      ) : (
        tickets.map((ticket, idx) => (
          <View key={ticket.id}>
            {(idx === 0 || tickets[idx - 1].year !== ticket.year) && ticket.year ? (
              <Text
                style={{
                  color: C.dark,
                  fontSize: 15,
                  fontWeight: '900',
                  marginTop: idx === 0 ? 0 : 8,
                  marginBottom: 10,
                }}
              >
                Año {ticket.year}
              </Text>
            ) : null}
          <Pressable
            onPress={() => router.push(`/ticket/${ticket.id}`)}
            style={{
              backgroundColor: C.white,
              borderWidth: 1,
              borderColor: C.line,
              borderRadius: 15,
              padding: 17,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: C.muted, fontSize: 12 }}>
              {ticket.code ?? `#${ticket.id}`}
            </Text>

            <Text
              style={{
                color: C.dark,
                fontSize: 17,
                fontWeight: '900',
                marginTop: 6,
              }}
            >
              {ticket.title}
            </Text>

            <Text style={{ color: C.muted, marginTop: 7 }}>
              Estado: {ticket.status ?? 'Sin estado'}
            </Text>

            <Text style={{ color: C.muted, marginTop: 4 }}>
              Prioridad: {ticket.priority ?? 'Media'}
            </Text>

            <Text style={{ color: C.muted, marginTop: 4 }}>
              {ticket.company ?? 'Sin empresa vinculada'}
            </Text>
          </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}
