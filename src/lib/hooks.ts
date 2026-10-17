import { useEffect, useState } from 'react';

/** Reloj que se actualiza cada `ms` milisegundos (para cuentas regresivas del ANS). */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}
