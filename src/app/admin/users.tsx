
import { api } from '@/api/client';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';

type UserItem = {
  id: number;
  name: string;
  email: string;
  role: string;
  area: string | null;
  active: number;
  company_id: number | null;
  company?: string | null;
  phone?: string | null;
  position?: string | null;
  tech_code?: string | null;
};

type Company = { id: number; name: string };

const ROLES = ['Administrador', 'Soporte TI', 'Técnico', 'Usuario'];
const AREAS = [
  'Administración', 'Soporte TI', 'Infraestructura', 'Seguridad',
  'Aplicaciones', 'Datos', 'Logística TI',
];

function notify(message: string) {
  if (Platform.OS === 'web') window.alert(message);
  else Alert.alert('EcoSoporte Digital', message);
}

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Usuario');
  const [area, setArea] = useState('Soporte TI');
  const [companyId, setCompanyId] = useState<number | null>(null);

  const [editing, setEditing] = useState<UserItem | null>(null);

  

const loadData = useCallback(async () => {
  setLoading(true);
  setError('');

  let userList: UserItem[] = [];
  let companyList: Company[] = [];
  const errors: string[] = [];

  try {
    const userData = await api<any>('/users');

    console.log('RESPUESTA API USUARIOS:', userData);

    if (Array.isArray(userData)) {
      userList = userData;
    } else if (Array.isArray(userData?.users)) {
      userList = userData.users;
    } else if (Array.isArray(userData?.items)) {
      userList = userData.items;
    } else {
      errors.push(
        'La API de usuarios no devolvió una lista reconocida.'
      );
    }
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : String(e);

    errors.push(`Usuarios: ${message}`);
    console.log('ERROR AL CARGAR USUARIOS:', message);
  }

  try {
    const companyData = await api<any>('/companies');

    console.log('RESPUESTA API EMPRESAS:', companyData);

    if (Array.isArray(companyData)) {
      companyList = companyData;
    } else if (Array.isArray(companyData?.companies)) {
      companyList = companyData.companies;
    } else if (Array.isArray(companyData?.items)) {
      companyList = companyData.items;
    } else {
      errors.push(
        'La API de empresas no devolvió una lista reconocida.'
      );
    }
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : String(e);

    errors.push(`Empresas: ${message}`);
    console.log('ERROR AL CARGAR EMPRESAS:', message);
  }

  setUsers(userList);
  setCompanies(companyList);

  setCompanyId(current =>
    current ?? companyList[0]?.id ?? null
  );

  if (errors.length > 0) {
    setError(errors.join('\n'));
  } else if (userList.length === 0 && companyList.length === 0) {
    setError(
      'La API respondió, pero no devolvió usuarios ni empresas. Hay que revisar el backend y la base de datos.'
    );
  }

  setLoading(false);
}, []);


  useEffect(() => { void loadData(); }, [loadData]);

  async function createUser() {
    if (!name.trim() || !email.trim() || password.length < 10) {
      notify('Completa el nombre, el correo y una contraseña de mínimo 10 caracteres.');
      return;
    }
    if (role === 'Usuario' && !companyId) {
      notify('Debes seleccionar una empresa para esta cuenta.');
      return;
    }

    setSaving(true);
    try {
      await api('/users', {
        method: 'POST',
        body: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          phone: phone.trim(),
          role,
          area: role === 'Usuario' ? 'Cliente' : area,
          company_id: role === 'Usuario' ? companyId : null,
        },
      });
      setName(''); setEmail(''); setPassword(''); setPhone('');
      setRole('Usuario'); setArea('Soporte TI');
      notify('Usuario creado correctamente.');
      await loadData();
    } catch (e: any) {
      notify(e?.message ?? 'No fue posible crear el usuario.');
    } finally {
      setSaving(false);
    }
  }

  async function saveRole() {
    if (!editing) return;
    setSaving(true);
    try {
      await api(`/users/${editing.id}/edit`, {
        method: 'POST',
        body: {
          name: (editing.name ?? '').trim(), email: (editing.email ?? '').trim(), phone: (editing.phone ?? '').trim(),
          position: (editing.position ?? '').trim(),
          role: editing.role, area: editing.role === 'Usuario' ? 'Cliente' : editing.area,
        },
      });
      setEditing(null);
      notify('Datos actualizados correctamente.');
      await loadData();
    } catch (e: any) {
      notify(e?.message ?? 'No fue posible actualizar los datos.');
    } finally {
      setSaving(false);
    }
  }

  
  async function retireUser(user: UserItem) {
    const message =
      `¿Deseas retirar a ${user.name} del sistema? ` +
      'Su cuenta quedará desactivada y se conservará su historial.';

    const run = async () => {
      setSaving(true);

      try {
        await api(`/users/${user.id}/delete`, {
          method: 'POST',
          body: {},
        });

        await loadData();
        notify('Usuario retirado correctamente. Su historial se conserva.');
      } catch (e: any) {
        notify(e?.message ?? 'No fue posible retirar al usuario.');
      } finally {
        setSaving(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(message)) {
        void run();
      }
    } else {
      Alert.alert('Retirar usuario', message, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Retirar',
          style: 'destructive',
          onPress: () => void run(),
        },
      ]);
    }
  }


  async function purgeUser(user: UserItem) {
    const message =
      `¿Eliminar definitivamente la cuenta de ${user.name}? Se borra de la base de datos. ` +
      'Sus tickets y su historial se conservan con su nombre. Esta acción no se puede deshacer.';
    const run = async () => {
      setSaving(true);
      try {
        await api(`/users/${user.id}/purge`, { method: 'POST', body: {} });
        await loadData();
        notify('Cuenta eliminada. El historial de los tickets se conserva.');
      } catch (e: any) {
        notify(e?.message ?? 'No fue posible eliminar la cuenta.');
      } finally {
        setSaving(false);
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(message)) void run();
    } else {
      Alert.alert('Eliminar cuenta', message, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => void run() },
      ]);
    }
  }

  const Button = ({
    label, onPress, secondary = false, disabled = false, danger = false,
  }: { label: string; onPress: () => void; secondary?: boolean; disabled?: boolean; danger?: boolean }) => (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, secondary && styles.secondary, danger && styles.danger, disabled && styles.disabled]}
    >
      <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: 'Administrar usuarios' }} />
      <Text style={styles.eyebrow}>ECOSOPORTE DIGITAL · ADMINISTRACIÓN</Text>
      <Text style={styles.title}>Gestión de usuarios</Text>
      <Text style={styles.subtitle}>Crea cuentas, asigna roles y controla el acceso al sistema.</Text>

      <View style={styles.card}>
        <Text style={styles.section}>Crear usuario</Text>
        <TextInput style={styles.input} placeholder="Nombre completo" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Correo electrónico" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Contraseña (mínimo 10 caracteres)" value={password} onChangeText={setPassword} secureTextEntry />
        <TextInput style={styles.input} placeholder="Teléfono (opcional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        <Text style={styles.label}>Rol</Text>
        <View style={styles.chips}>
          {ROLES.map(item => (
            <Pressable key={item} onPress={() => setRole(item)} style={[styles.chip, role === item && styles.chipSelected]}>
              <Text style={[styles.chipText, role === item && styles.chipTextSelected]}>{item}</Text>
            </Pressable>
          ))}
        </View>

        {role !== 'Usuario' && (
          <>
            <Text style={styles.label}>Área</Text>
            <View style={styles.chips}>
              {AREAS.map(item => (
                <Pressable key={item} onPress={() => setArea(item)} style={[styles.chip, area === item && styles.chipSelected]}>
                  <Text style={[styles.chipText, area === item && styles.chipTextSelected]}>{item}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {role === 'Usuario' && (
          <>
            <Text style={styles.label}>Empresa</Text>
            {companies.length === 0 ? (
              <Text style={styles.muted}>Primero registra una empresa en la sección Empresas.</Text>
            ) : (
              <View style={styles.chips}>
                {companies.map(company => (
                  <Pressable key={company.id} onPress={() => setCompanyId(company.id)} style={[styles.chip, companyId === company.id && styles.chipSelected]}>
                    <Text style={[styles.chipText, companyId === company.id && styles.chipTextSelected]}>{company.name}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}

        <Button label={saving ? 'Guardando…' : 'Crear usuario'} onPress={() => void createUser()} disabled={saving} />
      </View>

      <View style={styles.rowHeading}>
        <Text style={styles.section}>Usuarios registrados</Text>
        <Button label="Actualizar" secondary onPress={() => void loadData()} disabled={loading || saving} />
      </View>

      {loading && <ActivityIndicator size="large" color="#0BAA91" />}
      {!!error && <Text style={styles.error}>{error}</Text>}

      {!loading && users.map(user => (
        <View key={user.id} style={styles.userCard}>
          <View style={styles.userTop}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{user.name.slice(0, 1).toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.muted}>{user.email}</Text>
              <Text style={styles.muted}>{user.company || 'Sin empresa vinculada'}</Text>
            </View>
            <Text style={[styles.status, user.active ? styles.active : styles.inactive]}>{user.active ? 'Activo' : 'Inactivo'}</Text>
          </View>

          <Text style={styles.roleLine}>Rol: {user.role} · Área: {user.area || 'Sin área'}{user.tech_code ? ` · ${user.tech_code}` : ''}</Text>

          {editing?.id === user.id ? (
            <>
              <Text style={styles.label}>Datos de la cuenta</Text>
              <TextInput style={styles.input} placeholder="Nombre completo" value={editing.name} onChangeText={v => setEditing({ ...editing, name: v })} />
              <TextInput style={styles.input} placeholder="Correo electrónico" value={editing.email} onChangeText={v => setEditing({ ...editing, email: v })} autoCapitalize="none" keyboardType="email-address" />
              <TextInput style={styles.input} placeholder="Teléfono" value={editing.phone ?? ''} onChangeText={v => setEditing({ ...editing, phone: v })} keyboardType="phone-pad" />
              <TextInput style={styles.input} placeholder="Cargo" value={editing.position ?? ''} onChangeText={v => setEditing({ ...editing, position: v })} />
              <Text style={styles.label}>Cambiar rol</Text>
              <View style={styles.chips}>
                {ROLES.map(item => (
                  <Pressable key={item} onPress={() => setEditing({ ...editing, role: item, area: item === 'Usuario' ? 'Cliente' : (editing.area || 'Soporte TI') })} style={[styles.chip, editing.role === item && styles.chipSelected]}>
                    <Text style={[styles.chipText, editing.role === item && styles.chipTextSelected]}>{item}</Text>
                  </Pressable>
                ))}
              </View>
              {editing.role !== 'Usuario' && (
                <View style={styles.chips}>
                  {AREAS.map(item => (
                    <Pressable key={item} onPress={() => setEditing({ ...editing, area: item })} style={[styles.chip, editing.area === item && styles.chipSelected]}>
                      <Text style={[styles.chipText, editing.area === item && styles.chipTextSelected]}>{item}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              <View style={styles.actions}>
                <Button label="Guardar cambios" onPress={() => void saveRole()} disabled={saving} />
                <Button label="Cancelar" secondary onPress={() => setEditing(null)} />
              </View>
            </>
          ) : (
            <View style={styles.actions}>
              <Button label="Editar datos" secondary onPress={() => setEditing(user)} />
              <Button label="Retirar" secondary onPress={() => void retireUser(user)} disabled={saving} />
              <Button label="Eliminar" onPress={() => void purgeUser(user)} disabled={saving} danger />
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 18, paddingBottom: 48, backgroundColor: '#F4F8F7', flexGrow: 1, gap: 14 },
  eyebrow: { color: '#078A76', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  title: { color: '#14332F', fontSize: 27, fontWeight: '800' },
  subtitle: { color: '#657875', fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, gap: 11, borderWidth: 1, borderColor: '#E1ECE9' },
  section: { color: '#183C36', fontSize: 19, fontWeight: '800' },
  input: { borderWidth: 1, borderColor: '#D7E4E0', backgroundColor: '#FBFDFC', borderRadius: 10, padding: 12, color: '#183C36' },
  label: { color: '#36534D', fontSize: 13, fontWeight: '700', marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderWidth: 1, borderColor: '#D7E4E0', borderRadius: 20, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: '#FFFFFF' },
  chipSelected: { backgroundColor: '#DDF7F0', borderColor: '#0BAA91' },
  chipText: { color: '#47615B', fontSize: 12, fontWeight: '600' },
  chipTextSelected: { color: '#087D6C' },
  button: { backgroundColor: '#078A76', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  secondary: { backgroundColor: '#E6F2EF' },
  danger: { backgroundColor: '#B42318' },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  secondaryText: { color: '#176B5B' },
  disabled: { opacity: 0.55 },
  rowHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  userCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, gap: 12, borderWidth: 1, borderColor: '#E1ECE9' },
  userTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#DDF7F0', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#087D6C', fontSize: 18, fontWeight: '800' },
  userName: { color: '#183C36', fontWeight: '800', fontSize: 15 },
  muted: { color: '#71827E', fontSize: 12, marginTop: 2 },
  status: { borderRadius: 20, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5, fontSize: 11, fontWeight: '800' },
  active: { color: '#087D56', backgroundColor: '#DDF7E9' },
  inactive: { color: '#A33B3B', backgroundColor: '#FBE4E4' },
  roleLine: { color: '#526B65', fontSize: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  error: { color: '#B42318', backgroundColor: '#FEE4E2', padding: 12, borderRadius: 10 },
});
