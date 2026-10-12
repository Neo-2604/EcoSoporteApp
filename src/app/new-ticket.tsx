import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { api } from '../api/client';

const C = {
  teal: '#00A88F',
  dark: '#123F4B',
  muted: '#68848C',
  bg: '#F3FAF9',
  line: '#D9EAE8',
  white: '#FFFFFF',
  red: '#B93838',
};

export default function NewTicket() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function submit() {
    setError('');
    setSuccess('');

    if (!title.trim() || !description.trim()) {
      setError('Completa el asunto y la descripción.');
      return;
    }

    setLoading(true);

    try {
      const response = await api<{ id: number }>('/tickets', {
        method: 'POST',
        body: {
          title: title.trim(),
          description: description.trim(),
        },
      });

      setSuccess(`Ticket #${response.id} creado correctamente.`);
      setTitle('');
      setDescription('');
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : 'No se pudo crear el ticket.'
      );
    } finally {
      setLoading(false);
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
      <View style={{ width: '100%', maxWidth: 700, alignSelf: 'center' }}>
        <Pressable
          onPress={() => router.back()}
          style={{ paddingVertical: 10, marginBottom: 12 }}
        >
          <Text style={{ color: C.teal, fontWeight: '800' }}>
            ‹ Volver al panel
          </Text>
        </Pressable>

        <Text style={{ color: C.dark, fontSize: 27, fontWeight: '900' }}>
          Crear ticket
        </Text>

        <Text style={{ color: C.muted, marginTop: 6, marginBottom: 20 }}>
          Describe el problema técnico para que el equipo pueda atenderlo.
        </Text>

        <View
          style={{
            backgroundColor: C.white,
            borderWidth: 1,
            borderColor: C.line,
            borderRadius: 18,
            padding: 18,
          }}
        >
          <Text style={{ color: C.dark, fontWeight: '800', marginBottom: 8 }}>
            Asunto *
          </Text>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Ej. El computador no enciende"
            maxLength={160}
            style={{
              borderWidth: 1,
              borderColor: C.line,
              borderRadius: 11,
              padding: 13,
              color: C.dark,
              marginBottom: 16,
            }}
          />

          <Text style={{ color: C.dark, fontWeight: '800', marginBottom: 8 }}>
            Descripción del problema *
          </Text>

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Indica qué sucede, desde cuándo y qué has intentado..."
            multiline
            textAlignVertical="top"
            style={{
              borderWidth: 1,
              borderColor: C.line,
              borderRadius: 11,
              padding: 13,
              minHeight: 150,
              color: C.dark,
              marginBottom: 15,
            }}
          />

          {error ? (
            <Text style={{ color: C.red, marginBottom: 12 }}>{error}</Text>
          ) : null}

          {success ? (
            <Text
              style={{
                color: '#18794E',
                marginBottom: 12,
                fontWeight: '800',
              }}
            >
              {success}
            </Text>
          ) : null}

          <Pressable
            onPress={submit}
            disabled={loading}
            style={{
              backgroundColor: C.teal,
              borderRadius: 11,
              padding: 15,
              alignItems: 'center',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>
                Enviar solicitud
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}