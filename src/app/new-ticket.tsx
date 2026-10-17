import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth';
import { Btn, Chips, ErrorBox, Field, H, notify, Screen } from '../components/kit';
import { PRIORITIES } from '../lib/format';

type Company = { id: number; name: string };
const CATEGORIES = ['Soporte usuario', 'Hardware', 'Software', 'Redes', 'Seguridad', 'Otro'];

export default function NewTicket() {
  const { isStaff } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>('Media');
  const [category, setCategory] = useState<string>('Soporte usuario');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isStaff) return;
    api<Company[]>('/companies').then(setCompanies).catch(() => {});
  }, [isStaff]);

  async function submit() {
    setError('');
    if (!title.trim() || !description.trim()) { setError('Completa el asunto y la descripción.'); return; }
    setLoading(true);
    try {
      const r = await api<{ id: number; code?: string }>('/tickets', {
        method: 'POST',
        body: { title: title.trim(), description: description.trim(), ...(isStaff ? { priority, category, company_id: companyId } : {}) },
      });
      notify(`Ticket ${r.code ?? '#' + r.id} creado correctamente.`);
      router.replace(`/ticket/${r.id}`);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'No se pudo crear el ticket.'); }
    finally { setLoading(false); }
  }

  return (
    <Screen back title="Nuevo ticket" eyebrow="Mesa de servicio" footer={<Btn title="Crear ticket" icon="plus" loading={loading} onPress={submit} />}>
      <ErrorBox message={error} />
      <Field label="Asunto" value={title} onChangeText={setTitle} placeholder="Ej.: El equipo no enciende" />
      <Field label="Descripción" value={description} onChangeText={setDescription} placeholder="Cuéntanos qué ocurre, desde cuándo y qué ya probaste." multiline />
      {isStaff ? (
        <>
          <H>Prioridad</H>
          <Chips options={PRIORITIES} value={priority} onChange={v => v && setPriority(v)} />
          <H>Categoría</H>
          <Chips options={CATEGORIES} value={category} onChange={v => v && setCategory(v)} />
          <H>Empresa</H>
          {companies.length ? <Chips options={companies.map(x => String(x.id))} value={companyId ? String(companyId) : null} onChange={v => setCompanyId(v ? Number(v) : null)} all="Sin empresa" label={v => companies.find(x => String(x.id) === v)?.name ?? v} /> : null}
        </>
      ) : null}
    </Screen>
  );
}
