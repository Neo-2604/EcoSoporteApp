import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { api } from '../../api/client';

const C = {
  teal: '#00A88F',
  dark: '#123F4B',
  muted: '#68848C',
  bg: '#F3FAF9',
  line: '#D9EAE8',
  white: '#FFFFFF',
  red: '#B93838',
};

type Ticket = {
  id: number;
  code?: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  company?: string;
};

type Update = {
  note: string;
  status?: string;
  created_at?: string;
  name?: string;
};

export default function TicketDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError('');

    try {
      const data = await api<{
        ticket: Ticket;
        updates: Update[];
      }>(`/tickets/${id}`);

      setTicket(data.ticket);
      setUpdates(data.updates ?? []);
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : 'No se pudo cargar el ticket.'
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function addNote() {
    if (!note.trim()) {
      setError('Escribe una nota antes de enviarla.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await api(`/tickets/${id}/notes`, {
        method: 'POST',
        body: { note: note.trim() },
      });

      setNote('');
      await load();
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : 'No se pudo guardar la nota.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        padding: 20,
        paddingTop: 28,
        backgroundColor: C.bg,
      }}
    >
      <View style={{ width: '100%', maxWidth: 760, alignSelf: 'center' }}>
        <Pressable
          onPress={() => router.back()}
          style={{ paddingVertical: 10, marginBottom: 12 }}
        >
          <Text style={{ color: C.teal, fontWeight: '800' }}>‹ Volver</Text>
        </Pressable>

        {loading && !ticket ? (
          <ActivityIndicator color={C.teal} size="large" />
        ) : null}

        {error ? (
          <Text style={{ color: C.red, marginBottom: 12 }}>{error}</Text>
        ) : null}

        {ticket ? (
          <>
            <Text style={{ color: C.muted, fontSize: 12 }}>
              {ticket.code ?? `#${ticket.id}`}
            </Text>

            <Text
              style={{
                color: C.dark,
                fontSize: 26,
                fontWeight: '900',
                marginTop: 5,
              }}
            >
              {ticket.title}
            </Text>

            <View
              style={{
                backgroundColor: C.white,
                borderColor: C.line,
                borderWidth: 1,
                borderRadius: 16,
                padding: 17,
                marginTop: 16,
              }}
            >
              <Text style={{ color: C.muted }}>Estado</Text>
              <Text style={{ color: C.dark, fontWeight: '900', marginTop: 3 }}>
                {ticket.status ?? 'Sin estado'}
              </Text>

              <Text style={{ color: C.muted, marginTop: 14 }}>Prioridad</Text>
              <Text style={{ color: C.dark, fontWeight: '800', marginTop: 3 }}>
                {ticket.priority ?? 'Media'}
              </Text>

              {ticket.company ? (
                <Text style={{ color: C.muted, marginTop: 14 }}>
                  Empresa: {ticket.company}
                </Text>
              ) : null}

              {ticket.description ? (
                <Text style={{ color: C.dark, lineHeight: 22, marginTop: 14 }}>
                  {ticket.description}
                </Text>
              ) : null}
            </View>

            <Text
              style={{
                color: C.dark,
                fontSize: 19,
                fontWeight: '900',
                marginTop: 24,
                marginBottom: 10,
              }}
            >
              Historial de atención
            </Text>

            {updates.length ? (
              updates.map((update, index) => (
                <View
                  key={`${update.created_at ?? 'update'}-${index}`}
                  style={{
                    backgroundColor: C.white,
                    borderColor: C.line,
                    borderWidth: 1,
                    borderRadius: 13,
                    padding: 14,
                    marginBottom: 9,
                  }}
                >
                  <Text style={{ color: C.dark, fontWeight: '800' }}>
                    {update.name ?? 'Actualización'}
                    {update.status ? ` · ${update.status}` : ''}
                  </Text>

                  <Text style={{ color: C.muted, marginTop: 6, lineHeight: 21 }}>
                    {update.note}
                  </Text>

                  {update.created_at ? (
                    <Text style={{ color: C.muted, fontSize: 11, marginTop: 8 }}>
                      {update.created_at}
                    </Text>
                  ) : null}
                </View>
              ))
            ) : (
              <Text style={{ color: C.muted }}>
                Todavía no hay notas registradas.
              </Text>
            )}

            <View
              style={{
                backgroundColor: C.white,
                borderColor: C.line,
                borderWidth: 1,
                borderRadius: 16,
                padding: 16,
                marginTop: 18,
              }}
            >
              <Text
                style={{
                  color: C.dark,
                  fontSize: 17,
                  fontWeight: '900',
                  marginBottom: 10,
                }}
              >
                Agregar nota de atención
              </Text>

              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Describe el avance o la atención realizada..."
                multiline
                textAlignVertical="top"
                style={{
                  borderWidth: 1,
                  borderColor: C.line,
                  borderRadius: 11,
                  minHeight: 100,
                  padding: 12,
                  color: C.dark,
                }}
              />

              <Pressable
                onPress={addNote}
                disabled={saving}
                style={{
                  backgroundColor: C.teal,
                  borderRadius: 11,
                  padding: 14,
                  alignItems: 'center',
                  marginTop: 12,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>
                    Guardar nota
                  </Text>
                )}
              </Pressable>
            </View>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}