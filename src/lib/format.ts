// Fechas del servidor: UTC sin zona ("2026-10-15 03:44:23" o ISO). Se muestran en hora de Colombia (UTC-5).
export function parseUtc(s?: string | null): Date | null {
  if (!s) return null;
  const iso = s.includes('T') ? s : s.replace(' ', 'T');
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : iso + 'Z');
  return isNaN(d.getTime()) ? null : d;
}

export function fmtDate(s?: string | null): string {
  const d = parseUtc(s);
  if (!d) return s ?? '';
  const l = new Date(d.getTime() - 5 * 3600 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${l.getUTCFullYear()}-${p(l.getUTCMonth() + 1)}-${p(l.getUTCDate())} ${p(l.getUTCHours())}:${p(l.getUTCMinutes())}`;
}

export function ago(s?: string | null): string {
  const d = parseUtc(s);
  if (!d) return '';
  const sec = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return 'hace un momento';
  if (sec < 3600) return `hace ${Math.floor(sec / 60)} min`;
  if (sec < 86400) return `hace ${Math.floor(sec / 3600)} h`;
  return `hace ${Math.floor(sec / 86400)} d`;
}

export type Sla = { text: string; late: boolean; urgent: boolean; ms: number } | null;

// Tiempo restante para solucionar (ANS). Negativo = vencido.
export function slaLeft(due?: string | null, status?: string): Sla {
  if (!due || status === 'Resuelto' || status === 'Cerrado') return null;
  const d = parseUtc(due);
  if (!d) return null;
  const ms = d.getTime() - Date.now();
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3600000), m = Math.floor((abs % 3600000) / 60000), s = Math.floor((abs % 60000) / 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  const body = h >= 48 ? `${Math.floor(h / 24)} d ${h % 24} h` : `${p(h)}:${p(m)}:${p(s)}`;
  return { text: ms < 0 ? `Vencido ${body}` : body, late: ms < 0, urgent: ms < 3600000, ms };
}

export const STATUSES = ['Abierto', 'En proceso', 'En espera', 'Resuelto', 'Cerrado'] as const;
export const PRIORITIES = ['Baja', 'Media', 'Alta', 'Crítica'] as const;
