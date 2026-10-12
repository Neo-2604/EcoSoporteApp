
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Platform, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { Stack } from 'expo-router';
import { api } from '@/api/client';

type Ticket = {
  id: number;
  title: string;
  status: string;
  priority: string;
  area: string;
  assigned_to: number | null;
  company: string | null;
  creator: string;
  technician: string | null;
};

type Technician = { id: number; name: string; area: string | null };

type AssignmentData = {
  tickets: Ticket[];
  technicians: Technician[];
  areas: string[];
};

function notify(message: string) {
  if (Platform.OS === 'web') window.alert(message);
  else Alert.alert('EcoSoporte Digital', message);
}

export default function AdminAssignmentsScreen() {
  const [data, setData] = useState<AssignmentData>({
    tickets: [], technicians: [], areas: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<number | null>(null);
  const [selectedArea, setSelectedArea] = useState('Soporte TI');
  const [selectedTechnician, setSelectedTechnician] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api<AssignmentData>('/assignments');
      setData(result);
    } catch (e: any) {
      setError(e?.message ?? 'No se pudieron cargar las asignaciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const availableTechnicians = data.technicians.filter(
    technician => technician.area === selectedArea,
  );

  function chooseTicket(ticket: Ticket) {
    setSelectedTicket(ticket.id);
    setSelectedArea(ticket.area || 'Soporte TI');
    setSelectedTechnician(ticket.assigned_to);
  }

  async function saveAssignment() {
    if (!selectedTicket) {
      notify('Selecciona un ticket.');
      return;
    }

    if (
      selectedTechnician !== null &&
      !availableTechnicians.some(t => t.id === selectedTechnician)
    ) {
      notify('Selecciona un técnico activo de la misma área o deja el ticket sin asignar.');
      return;
    }

    setSaving(true);
    try {
      await api('/assignments', {
        method: 'POST',
        body: {
          ticket_id: selectedTicket,
          area: selectedArea,
          technician_id: selectedTechnician,
        },
      });
      notify('Asignación actualizada correctamente.');
      setSelectedTicket(null);
      setSelectedTechnician(null);
      await loadData();
    } catch (e: any) {
      notify(e?.message ?? 'No se pudo actualizar la asignación.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: 'Asignación de tickets' }} />

      <Text style={styles.eyebrow}>ECOSOPORTE DIGITAL · OPERACIONES</Text>
      <Text style={styles.title}>Asignación de tickets</Text>
      <Text style={styles.subtitle}>
        Selecciona una solicitud, define su área y asigna al técnico responsable.
      </Text>

      <View style={styles.card}>
        <Text style={styles.heading}>1. Selecciona un ticket</Text>

        {loading && <ActivityIndicator size="large" color="#078A76" />}
        {!!error && <Text style={styles.error}>{error}</Text>}

        {!loading && data.tickets.length === 0 && !error && (
          <Text style={styles.muted}>No hay tickets disponibles.</Text>
        )}

        {data.tickets.map(ticket => (
          <Pressable
            key={ticket.id}
            onPress={() => chooseTicket(ticket)}
            style={[
              styles.ticket,
              selectedTicket === ticket.id && styles.ticketSelected,
            ]}
          >
            <View style={styles.ticketTop}>
              <Text style={styles.ticketId}>Ticket #{ticket.id}</Text>
              <Text style={styles.priority}>{ticket.priority}</Text>
            </View>
            <Text style={styles.ticketTitle}>{ticket.title}</Text>
            <Text style={styles.muted}>
              Empresa: {ticket.company || 'No especificada'}
            </Text>
            <Text style={styles.muted}>Solicitante: {ticket.creator}</Text>
            <Text style={styles.muted}>Estado: {ticket.status}</Text>
            <Text style={styles.muted}>
              Área: {ticket.area} · Técnico: {ticket.technician || 'Sin asignar'}
            </Text>
            {selectedTicket === ticket.id && (
              <Text style={styles.selectedText}>Ticket seleccionado</Text>
            )}
          </Pressable>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>2. Selecciona el área</Text>
        <View style={styles.chips}>
          {data.areas.map(area => (
            <Pressable
              key={area}
              onPress={() => {
                setSelectedArea(area);
                setSelectedTechnician(null);
              }}
              style={[styles.chip, selectedArea === area && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selectedArea === area && styles.chipTextSelected]}>
                {area}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.heading}>3. Asigna el técnico</Text>
        <Text style={styles.muted}>
          Solo aparecen técnicos activos del área seleccionada.
        </Text>

        <Pressable
          onPress={() => setSelectedTechnician(null)}
          style={[styles.technician, selectedTechnician === null && styles.technicianSelected]}
        >
          <Text style={styles.technicianName}>Sin asignar</Text>
          <Text style={styles.muted}>Dejar el ticket pendiente de asignación</Text>
        </Pressable>

        {availableTechnicians.map(technician => (
          <Pressable
            key={technician.id}
            onPress={() => setSelectedTechnician(technician.id)}
            style={[
              styles.technician,
              selectedTechnician === technician.id && styles.technicianSelected,
            ]}
          >
            <Text style={styles.technicianName}>{technician.name}</Text>
            <Text style={styles.muted}>Área: {technician.area}</Text>
            {selectedTechnician === technician.id && (
              <Text style={styles.selectedText}>Técnico seleccionado</Text>
            )}
          </Pressable>
        ))}

        {availableTechnicians.length === 0 && (
          <Text style={styles.muted}>
            No hay técnicos activos en esta área. Puedes dejar el ticket sin asignar.
          </Text>
        )}

        <Pressable
          disabled={saving || loading || !selectedTicket}
          onPress={() => void saveAssignment()}
          style={[styles.button, (saving || loading || !selectedTicket) && styles.disabled]}
        >
          <Text style={styles.buttonText}>
            {saving ? 'Guardando…' : 'Guardar asignación'}
          </Text>
        </Pressable>

        <Pressable style={styles.refresh} onPress={() => void loadData()}>
          <Text style={styles.refreshText}>Actualizar tickets y técnicos</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, padding: 18, paddingBottom: 45, gap: 14, backgroundColor: '#F4F8F7' },
  eyebrow: { color: '#078A76', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  title: { color: '#14332F', fontSize: 27, fontWeight: '800' },
  subtitle: { color: '#657875', fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 15, gap: 12, borderWidth: 1, borderColor: '#E1ECE9' },
  heading: { color: '#183C36', fontSize: 17, fontWeight: '800' },
  ticket: { borderWidth: 1, borderColor: '#E1ECE9', padding: 12, borderRadius: 12, gap: 5 },
  ticketSelected: { borderColor: '#078A76', backgroundColor: '#F0FBF7' },
  ticketTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  ticketId: { color: '#078A76', fontWeight: '800', fontSize: 12 },
  priority: { color: '#8A5A12', fontWeight: '700', fontSize: 12 },
  ticketTitle: { color: '#183C36', fontWeight: '800', fontSize: 15 },
  muted: { color: '#71827E', fontSize: 12, lineHeight: 18 },
  selectedText: { color: '#087D6C', fontSize: 12, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderWidth: 1, borderColor: '#D7E4E0', borderRadius: 20, paddingHorizontal: 11, paddingVertical: 9 },
  chipSelected: { backgroundColor: '#DDF7F0', borderColor: '#078A76' },
  chipText: { color: '#47615B', fontSize: 12, fontWeight: '600' },
  chipTextSelected: { color: '#087D6C' },
  technician: { borderWidth: 1, borderColor: '#E1ECE9', padding: 12, borderRadius: 12, gap: 4 },
  technicianSelected: { borderColor: '#078A76', backgroundColor: '#F0FBF7' },
  technicianName: { color: '#183C36', fontWeight: '800', fontSize: 14 },
  button: { backgroundColor: '#078A76', padding: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '800' },
  disabled: { opacity: 0.5 },
  refresh: { backgroundColor: '#E6F2EF', padding: 12, borderRadius: 10, alignItems: 'center' },
  refreshText: { color: '#176B5B', fontWeight: '700' },
  error: { color: '#B42318', backgroundColor: '#FEE4E2', padding: 12, borderRadius: 10 },
});
