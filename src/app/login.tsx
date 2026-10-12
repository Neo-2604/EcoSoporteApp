import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, setToken } from '../api/client';

const C = {
  teal: '#00A88F',
  dark: '#123F4B',
  muted: '#68848C',
  bg: '#F3FAF9',
  line: '#D9EAE8',
  white: '#FFFFFF',
  red: '#B93838',
};

export default function Login() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function entrar() {
    setError('');

    if (!email.trim() || !password) {
      setError('Escribe tu correo y contraseña.');
      return;
    }

    setLoading(true);

    try {
      const response = await api<{ token: string; user: unknown }>(
        '/login',
        {
          method: 'POST',
          body: {
            email: email.trim().toLowerCase(),
            password,
          },
        }
      );

      await setToken(response.token);
      router.replace('/');
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : 'No se pudo iniciar sesión.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 22,
          paddingTop: Math.max(insets.top, 20) + 10,
          paddingBottom: Math.max(insets.bottom, 20) + 10,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center' }}>
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <View
              style={{
                width: 76,
                height: 76,
                borderRadius: 25,
                backgroundColor: C.teal,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 38, fontWeight: '900' }}>
                E
              </Text>
            </View>

            <Text
              style={{
                color: C.dark,
                fontSize: 27,
                fontWeight: '900',
                textAlign: 'center',
              }}
            >
              EcoSoporte Digital
            </Text>

            <Text style={{ color: C.muted, marginTop: 7 }}>
              Soporte tecnológico para tu empresa
            </Text>
          </View>

          <View
            style={{
              backgroundColor: C.white,
              borderRadius: 22,
              borderWidth: 1,
              borderColor: C.line,
              padding: 22,
            }}
          >
            <Text style={{ color: C.dark, fontSize: 22, fontWeight: '900' }}>
              Bienvenido
            </Text>

            <Text style={{ color: C.muted, marginTop: 6, marginBottom: 20 }}>
              Ingresa con las credenciales de tu cuenta.
            </Text>

            <Text style={{ color: C.dark, fontWeight: '800', marginBottom: 7 }}>
              Correo electrónico
            </Text>

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="usuario@empresa.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={{
                borderWidth: 1,
                borderColor: C.line,
                borderRadius: 12,
                padding: 14,
                color: C.dark,
                marginBottom: 15,
              }}
            />

            <Text style={{ color: C.dark, fontWeight: '800', marginBottom: 7 }}>
              Contraseña
            </Text>

            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Ingresa tu contraseña"
              secureTextEntry={!show}
              onSubmitEditing={entrar}
              style={{
                borderWidth: 1,
                borderColor: C.line,
                borderRadius: 12,
                padding: 14,
                color: C.dark,
              }}
            />

            <Pressable
              onPress={() => setShow(!show)}
              style={{ alignSelf: 'flex-end', paddingVertical: 12 }}
            >
              <Text style={{ color: C.teal, fontWeight: '800' }}>
                {show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              </Text>
            </Pressable>

            {error ? (
              <Text style={{ color: C.red, marginBottom: 12 }}>{error}</Text>
            ) : null}

            <Pressable
              onPress={entrar}
              disabled={loading}
              style={{
                backgroundColor: C.teal,
                borderRadius: 12,
                padding: 15,
                alignItems: 'center',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>
                  Iniciar sesión
                </Text>
              )}
            </Pressable>
          </View>

          <Text
            style={{
              color: C.muted,
              textAlign: 'center',
              fontSize: 12,
              marginTop: 20,
            }}
          >
            Acceso protegido · EcoSoporte Digital
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}