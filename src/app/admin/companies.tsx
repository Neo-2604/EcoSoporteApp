
import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator, Alert, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Stack } from 'expo-router';
import { AdminFrame } from '@/components/kit';
import { api } from '@/api/client';
import { Palette, useTheme } from '@/theme';

type Company = {
  id: number;
  name: string;
  nit: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  contact_name: string | null;
  active_users: number;
  ticket_count: number;
};

function notify(message: string) {
  if (Platform.OS === 'web') window.alert(message);
  else Alert.alert('EcoSoporte Digital', message);
}

export default function AdminCompaniesScreen() {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [nit, setNit] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [contact, setContact] = useState('');

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setCompanies(await api<Company[]>('/companies'));
    } catch (e: any) {
      setError(e?.message ?? 'No se pudieron cargar las empresas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadCompanies(); }, [loadCompanies]);

  async function createCompany() {
    if (!name.trim() || !email.trim()) {
      notify('El nombre y el correo de la empresa son obligatorios.');
      return;
    }

    setSaving(true);
    try {
      await api('/companies', {
        method: 'POST',
        body: {
          name: name.trim(),
          nit: nit.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          city: city.trim(),
          address: address.trim(),
          contact_name: contact.trim(),
        },
      });

      setName(''); setNit(''); setEmail(''); setPhone('');
      setCity(''); setAddress(''); setContact('');
      notify('Empresa registrada correctamente.');
      await loadCompanies();
    } catch (e: any) {
      notify(e?.message ?? 'No se pudo registrar la empresa.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminFrame>
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: 'Empresas registradas' }} />
      <Text style={styles.eyebrow}>ECOSOPORTE DIGITAL · DIRECTORIO</Text>
      <Text style={styles.title}>Empresas</Text>
      <Text style={styles.subtitle}>
        Administra la información de las organizaciones atendidas por EcoSoporte Digital.
      </Text>

      <View style={styles.card}>
        <Text style={styles.heading}>Registrar empresa</Text>
        <TextInput placeholderTextColor={c.muted} style={styles.input} placeholder="Nombre de la empresa *" value={name} onChangeText={setName} />
        <TextInput placeholderTextColor={c.muted} style={styles.input} placeholder="NIT (opcional)" value={nit} onChangeText={setNit} />
        <TextInput placeholderTextColor={c.muted} style={styles.input} placeholder="Correo empresarial *" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput placeholderTextColor={c.muted} style={styles.input} placeholder="Teléfono" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <TextInput placeholderTextColor={c.muted} style={styles.input} placeholder="Ciudad" value={city} onChangeText={setCity} />
        <TextInput placeholderTextColor={c.muted} style={styles.input} placeholder="Dirección" value={address} onChangeText={setAddress} />
        <TextInput placeholderTextColor={c.muted} style={styles.input} placeholder="Nombre del contacto" value={contact} onChangeText={setContact} />

        <Pressable style={[styles.button, saving && styles.disabled]} disabled={saving} onPress={() => void createCompany()}>
          <Text style={styles.buttonText}>{saving ? 'Guardando…' : 'Registrar empresa'}</Text>
        </Pressable>
      </View>

      <View style={styles.listHeading}>
        <Text style={styles.heading}>Empresas registradas ({companies.length})</Text>
        <Pressable style={styles.refresh} onPress={() => void loadCompanies()}>
          <Text style={styles.refreshText}>Actualizar</Text>
        </Pressable>
      </View>

      {loading && <ActivityIndicator size="large" color={c.accent} />}
      {!!error && <Text style={styles.error}>{error}</Text>}

      {!loading && companies.map(company => (
        <View key={company.id} style={styles.companyCard}>
          <View style={styles.companyHeader}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>{company.name.slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.companyName}>{company.name}</Text>
              <Text style={styles.muted}>NIT: {company.nit || 'No registrado'}</Text>
            </View>
          </View>

          <Text style={styles.detail}>Correo: {company.email}</Text>
          <Text style={styles.detail}>Contacto: {company.contact_name || 'No registrado'}</Text>
          <Text style={styles.detail}>Teléfono: {company.phone || 'No registrado'}</Text>
          <Text style={styles.detail}>Ubicación: {[company.address, company.city].filter(Boolean).join(', ') || 'No registrada'}</Text>

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{company.active_users ?? 0}</Text>
              <Text style={styles.statLabel}>Usuarios activos</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{company.ticket_count ?? 0}</Text>
              <Text style={styles.statLabel}>Tickets</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
    </AdminFrame>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  page: { flexGrow: 1, padding: 18, paddingTop: 14, paddingBottom: 45, gap: 14, backgroundColor: c.bg },
  eyebrow: { color: c.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  title: { color: c.ink, fontSize: 28, fontWeight: '800' },
  subtitle: { color: c.muted, fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: c.card, borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: c.line },
  heading: { color: c.ink, fontSize: 18, fontWeight: '800' },
  input: { borderWidth: 1, borderColor: c.line, backgroundColor: c.inputBg, borderRadius: 10, padding: 12, color: c.ink },
  button: { backgroundColor: c.accent, borderRadius: 10, padding: 13, alignItems: 'center' },
  buttonText: { color: c.accentInk, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  refresh: { backgroundColor: c.accentSoft, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 9 },
  refreshText: { color: c.accent, fontWeight: '700' },
  companyCard: { backgroundColor: c.card, borderRadius: 16, padding: 15, gap: 8, borderWidth: 1, borderColor: c.line },
  companyHeader: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 4 },
  logo: { width: 42, height: 42, borderRadius: 12, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: c.accent, fontSize: 19, fontWeight: '800' },
  companyName: { color: c.ink, fontSize: 16, fontWeight: '800' },
  muted: { color: c.muted, fontSize: 12, marginTop: 3 },
  detail: { color: c.muted, fontSize: 13, lineHeight: 19 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 6 },
  stat: { flex: 1, backgroundColor: c.accentSoft, borderRadius: 10, padding: 11 },
  statNumber: { color: c.accent, fontSize: 22, fontWeight: '800' },
  statLabel: { color: c.muted, fontSize: 11 },
  error: { color: c.danger, backgroundColor: c.dangerSoft, padding: 12, borderRadius: 10 },
});
