import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { api } from '../api/client';
import { useAuth } from '../auth';
import { Field } from '../components/kit';
import { useTheme } from '../theme';

export default function Login() {
  const { c, dark } = useTheme();
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function entrar() {
    setError('');
    if (!email.trim() || !password) { setError('Escribe tu correo y contraseña.'); return; }
    setLoading(true);
    try {
      const r = await api<{ token: string }>('/login', { method: 'POST', body: { email: email.trim().toLowerCase(), password } });
      await signIn(r.token); // al haber sesión, la app pasa sola al inicio
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión.');
    } finally { setLoading(false); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 22, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}>
        <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center' }}>
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            {/* En modo oscuro el logo va sobre una tarjeta clara para que se lea con sus colores */}
            <View style={{ backgroundColor: dark ? '#F2FAF9' : 'transparent', borderRadius: 24, paddingHorizontal: 18, paddingVertical: 8 }}>
              <Image source={require('../../assets/images/logo-completo.png')} resizeMode="contain" style={{ width: 230, height: 150 }} />
            </View>
            <Text style={{ color: c.muted, marginTop: 8, fontSize: 13 }}>App para técnicos y administración</Text>
          </View>

          <View style={{ backgroundColor: c.card, borderRadius: 22, borderWidth: 1, borderColor: c.line, padding: 20 }}>
            <Text style={{ color: c.ink, fontSize: 21, fontWeight: '800' }}>Bienvenido</Text>
            <Text style={{ color: c.muted, marginTop: 4, marginBottom: 18 }}>Ingresa con las credenciales de tu cuenta.</Text>
            <Field label="Correo electrónico" value={email} onChangeText={setEmail} placeholder="usuario@empresa.com" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" />
            <Field label="Contraseña" value={password} onChangeText={setPassword} placeholder="Tu contraseña" secureTextEntry={!show} onSubmitEditing={entrar} />
            <Pressable onPress={() => setShow(!show)} style={{ alignSelf: 'flex-end', paddingBottom: 12 }}>
              <Text style={{ color: c.accent, fontWeight: '800' }}>{show ? 'Ocultar contraseña' : 'Mostrar contraseña'}</Text>
            </Pressable>
            {error ? <Text style={{ color: c.danger, marginBottom: 12 }}>{error}</Text> : null}
            <Pressable onPress={entrar} disabled={loading} style={{ backgroundColor: c.accent, borderRadius: 14, minHeight: 52, alignItems: 'center', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}>
              {loading ? <ActivityIndicator color={c.accentInk} /> : <Text style={{ color: c.accentInk, fontWeight: '800', fontSize: 15 }}>Iniciar sesión</Text>}
            </Pressable>
          </View>
          <Text style={{ color: c.muted, textAlign: 'center', fontSize: 12, marginTop: 18 }}>Acceso protegido · EcoSoporte Digital</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
