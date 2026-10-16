import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Card, Muted, Pill, priorityTone, statusTone } from './kit';
import { useNow } from '../lib/hooks';
import { slaLeft } from '../lib/format';
import { useTheme } from '../theme';

export type Ticket = {
  id: number; code?: string; year?: number; title: string; description?: string; priority?: string; status?: string;
  company?: string | null; creator?: string | null; technician?: string | null; solution_due?: string | null; response_due?: string | null;
  assigned_to?: number | null; area?: string | null; category?: string | null;
};

export function SlaText({ due, status, size = 12 }: { due?: string | null; status?: string; size?: number }) {
  const { c } = useTheme();
  useNow(1000);
  const s = slaLeft(due, status);
  if (!s) return null;
  const color = s.late ? c.danger : s.urgent ? c.warn : c.muted;
  return <Text style={{ color, fontSize: size, fontWeight: '800', fontVariant: ['tabular-nums'] }}>⏱ {s.text}</Text>;
}

export function TicketCard({ t, compact }: { t: Ticket; compact?: boolean }) {
  const { c } = useTheme();
  return (
    <Card onPress={() => router.push(`/ticket/${t.id}`)} style={{ padding: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <Text style={{ color: c.muted, fontSize: 11.5, fontWeight: '800', letterSpacing: 0.8 }}>{t.code ?? `#${t.id}`}</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pill text={t.priority ?? 'Media'} tone={priorityTone(t.priority)} />
          {!compact ? <Pill text={t.status ?? 'Abierto'} tone={statusTone(t.status)} /> : null}
        </View>
      </View>
      <Text numberOfLines={2} style={{ color: c.ink, fontSize: 15.5, fontWeight: '800', marginTop: 8 }}>{t.title}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 8 }}>
        <Muted style={{ flex: 1 }}>{t.company ?? 'Sin empresa vinculada'}{compact ? ` · ${t.status ?? ''}` : ''}</Muted>
        <SlaText due={t.solution_due} status={t.status} />
      </View>
    </Card>
  );
}
