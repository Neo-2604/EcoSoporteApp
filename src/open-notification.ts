import { router } from 'expo-router';

// Abre la pantalla que corresponde a un aviso: el ticket, o «En vivo» para las conexiones.
export function openNotification(n: { kind?: string; ticket_id?: number | null }) {
  if (n.ticket_id) router.push(`/ticket/${n.ticket_id}` as never);
  else if (n.kind === 'conexion') router.push('/live' as never);
}
