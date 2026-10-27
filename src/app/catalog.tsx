import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { api } from '../api/client';
import { Card, Empty, ErrorBox, Field, IdChip, Loading, Muted, Pill, Row, Screen } from '../components/kit';
import { useTheme } from '../theme';

type Item = { id: number; code: string; kind: string; category?: string | null; name: string; summary?: string | null; description?: string | null; price: string };

export default function Catalog() {
  const { c } = useTheme();
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const seq = useRef(0);

  const load = useCallback(async (text: string) => {
    const my = ++seq.current;
    setLoading(true); setError('');
    try {
      const d = await api<{ items: Item[] }>(`/catalog${text.trim() ? `?q=${encodeURIComponent(text.trim())}` : ''}`);
      if (my === seq.current) setItems(d.items);
    } catch (e: unknown) { if (my === seq.current) setError(e instanceof Error ? e.message : 'No se pudo cargar el catálogo.'); }
    finally { if (my === seq.current) setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(q); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [load]));
  useEffect(() => { const t = setTimeout(() => { void load(q); }, 350); return () => clearTimeout(t); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [q]);

  return (
    <Screen back title="Catálogo" eyebrow="Productos y servicios" refreshing={loading && !!items.length} onRefresh={() => load(q)}>
      <Field value={q} onChangeText={setQ} placeholder="Buscar por nombre o código (CAT-0001)…" autoCapitalize="none" />
      <ErrorBox message={error} onRetry={() => load(q)} />
      {loading && !items.length ? <Loading /> : null}
      {!loading && !error && !items.length ? <Empty text={q.trim() ? 'No hay resultados para esa búsqueda.' : 'Todavía no hay servicios publicados. El administrador los publica desde la web.'} /> : null}
      {items.map(it => (
        <Card key={it.id} onPress={() => setOpen(open === it.id ? null : it.id)} style={{ padding: 14 }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, gap: 4 }}>
              <IdChip code={it.code} />
              <Text style={{ color: c.ink, fontWeight: '800', fontSize: 15.5 }}>{it.name}</Text>
              <Muted>{it.kind}{it.category ? ` · ${it.category}` : ''}</Muted>
            </View>
            <Pill text={it.price} tone={it.price === 'Requiere cotización' ? 'neutral' : 'accent'} />
          </Row>
          {it.summary ? <Text style={{ color: c.muted, marginTop: 8, lineHeight: 20 }}>{it.summary}</Text> : null}
          {open === it.id && it.description ? <Text style={{ color: c.ink, marginTop: 8, lineHeight: 21 }}>{it.description}</Text> : null}
        </Card>
      ))}
    </Screen>
  );
}
