
import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator, Alert, Platform, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { Stack } from 'expo-router';
import { AdminFrame } from '@/components/kit';
import { api } from '@/api/client';
import { Palette, useTheme } from '@/theme';

type Ticket = {
  id: number;
  code?: string;
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
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
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
    <AdminFrame>
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: 'Asignación de tickets' }} />

      <Text style={styles.eyebrow}>ECOSOPORTE DIGITAL · OPERACIONES</Text>
      <Text style={styles.title}>Asignación de tickets</Text>
      <Text style={styles.subtitle}>
        Selecciona una solicitud, define su área y asigna al técnico responsable.
      </Text>

      <View style={styles.card}>
        <Text style={styles.heading}>Selecciona un ticket</Text>
        <Text style={styles.muted}>Al tocar un ticket se abre justo debajo la asignación de área y técnico.</Text>

        {loading && <ActivityIndicator size="large" color={c.accent} />}
        {!!error && <Text style={styles.error}>{error}</Text>}

        {!loading && data.tickets.length === 0 && !error && (
          <Text style={styles.muted}>No hay tickets disponibles.</Text>
        )}

        {data.tickets.map(ticket => {
          const open = selectedTicket === ticket.id;
          return (
            <View key={ticket.id} style={[styles.ticket, open && styles.ticketSelected]}>
              <Pressable onPress={() => (open ? setSelectedTicket(null) : chooseTicket(ticket))} style={{ gap: 5 }}>
                <View style={styles.ticketTop}>
                  <Text style={styles.ticketId}>{ticket.code ?? `#${ticket.id}`}</Text>
                  <Text style={styles.priority}>{ticket.priority}</Text>
                </View>
                <Text style={styles.ticketTitle}>{ticket.title}</Text>
                <Text style={styles.muted}>Empresa: {ticket.company || 'No especificada'}</Text>
                <Text style={styles.muted}>Solicitante: {ticket.creator}</Text>
                <Text style={styles.muted}>Estado: {ticket.status}</Text>
                <Text style={styles.muted}>Área: {ticket.area} · Técnico: {ticket.technician || 'Sin asignar'}</Text>
                <Text style={styles.selectedText}>{open ? 'Ocultar asignación ▲' : 'Asignar técnico ▼'}</Text>
              </Pressable>

              {open && (
                <View style={styles.panel}>
                  <Text style={styles.heading}>Área</Text>
                  <View style={styles.chips}>
                    {data.areas.map(area => (
                      <Pressable
                        key={area}
                        onPress={() => { setSelectedArea(area); setSelectedTechnician(null); }}
                        style={[styles.chip, selectedArea === area && styles.chipSelected]}
                      >
                        <Text style={[styles.chipText, selectedArea === area && styles.chipTextSelected]}>{area}</Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={styles.heading}>Técnico</Text>
                  <Pressable
                    onPress={() => setSelectedTechnician(null)}
                    style={[styles.technician, selectedTechnician === null && styles.technicianSelected]}
                  >
                    <Text style={styles.technicianName}>Sin asignar</Text>
                  </Pressable>
                  {availableTechnicians.map(technician => (
                    <Pressable
                      key={technician.id}
                      onPress={() => setSelectedTechnician(technician.id)}
                      style={[styles.technician, selectedTechnician === technician.id && styles.technicianSelected]}
                    >
                      <Text style={styles.technicianName}>{technician.name}</Text>
                      <Text style={styles.muted}>Área: {technician.area}</Text>
                    </Pressable>
                  ))}
                  {availableTechnicians.length === 0 && (
                    <Text style={styles.muted}>No hay técnicos activos en esta área. Puedes dejar el ticket sin asignar.</Text>
                  )}

                  <Pressable
                    disabled={saving || loading}
                    onPress={() => void saveAssignment()}
                    style={[styles.button, (saving || loading) && styles.disabled]}
                  >
                    <Text style={styles.buttonText}>{saving ? 'Guardando…' : 'Guardar asignación'}</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}

        <Pressable style={styles.refresh} onPress={() => void loadData()}>
          <Text style={styles.refreshText}>Actualizar tickets y técnicos</Text>
        </Pressable>
      </View>
    </ScrollView>
    </AdminFrame>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  page: { flexGrow: 1, padding: 18, paddingTop: 14, paddingBottom: 45, gap: 14, backgroundColor: c.bg },
  eyebrow: { color: c.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  title: { color: c.ink, fontSize: 27, fontWeight: '800' },
  subtitle: { color: c.muted, fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: c.card, borderRadius: 16, padding: 15, gap: 12, borderWidth: 1, borderColor: c.line },
  heading: { color: c.ink, fontSize: 17, fontWeight: '800' },
  ticket: { borderWidth: 1, borderColor: c.line, padding: 12, borderRadius: 12, gap: 5 },
  panel: { borderTopWidth: 1, borderColor: c.line, marginTop: 10, paddingTop: 12, gap: 10 },
  ticketSelected: { borderColor: c.accent, backgroundColor: c.accentSoft },
  ticketTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  ticketId: { color: c.accent, fontWeight: '800', fontSize: 12 },
  priority: { color: c.warn, fontWeight: '700', fontSize: 12 },
  ticketTitle: { color: c.ink, fontWeight: '800', fontSize: 15 },
  muted: { color: c.muted, fontSize: 12, lineHeight: 18 },
  selectedText: { color: c.accent, fontSize: 12, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderWidth: 1, borderColor: c.line, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 9 },
  chipSelected: { backgroundColor: c.accentSoft, borderColor: c.accent },
  chipText: { color: c.muted, fontSize: 12, fontWeight: '600' },
  chipTextSelected: { color: c.accent },
  technician: { borderWidth: 1, borderColor: c.line, padding: 12, borderRadius: 12, gap: 4 },
  technicianSelected: { borderColor: c.accent, backgroundColor: c.accentSoft },
  technicianName: { color: c.ink, fontWeight: '800', fontSize: 14 },
  button: { backgroundColor: c.accent, padding: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: c.accentInk, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  refresh: { backgroundColor: c.accentSoft, padding: 12, borderRadius: 10, alignItems: 'center' },
  refreshText: { color: c.accent, fontWeight: '700' },
  error: { color: c.danger, backgroundColor: c.dangerSoft, padding: 12, borderRadius: 10 },
});
