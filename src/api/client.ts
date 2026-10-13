import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Dirección del backend (https://...onrender.com). En desarrollo: archivo .env (EXPO_PUBLIC_API_URL).
// En el APK se toma de eas.json (build.<perfil>.env), porque .env no se sube a EAS.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:5000';
const KEY = 'ecosoporte_token';

export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') return localStorage.getItem(KEY);
  return SecureStore.getItemAsync(KEY);
}

export async function setToken(token: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
    return;
  }
  if (token) await SecureStore.setItemAsync(KEY, token);
  else await SecureStore.deleteItemAsync(KEY);
}

export class AuthError extends Error {}

type Options = { method?: 'GET' | 'POST'; body?: unknown };

export async function api<T = any>(path: string, opts: Options = {}): Promise<T> {
  const token = await getToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000); // 60 s: el servidor gratuito de Render puede tardar ~1 min en despertar

  try {
    const res = await fetch(`${API_URL}/api/v1${path}`, {
      method: opts.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));

    if (res.status === 401 && token) {
      await setToken(null);
      throw new AuthError(data.error ?? 'Sesión vencida');
    }
    if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
    return data as T;
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new Error('El servidor está tardando en responder (puede estar despertando). Espera unos segundos y pulsa Reintentar.');
    }
    if (e instanceof TypeError) {
      throw new Error('No se pudo conectar con el servidor. Revisa tu conexión a internet e inténtalo de nuevo.');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
