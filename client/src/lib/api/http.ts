import { loadTokens, saveTokens } from '../auth/tokenStore';
import { useAuth } from '../auth/authStore';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const BASE = import.meta.env.VITE_API_URL;

let refreshInFlight: Promise<boolean> | null = null;

/** Refresh the access token. Coalesces concurrent attempts. */
async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const tokens = await loadTokens();
    if (!tokens) return false;

    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    if (!res.ok) {
      useAuth.getState().markExpired();   // keep data, pause sync
      return false;
    }
    const data = await res.json() as {
      accessToken: string; refreshToken: string; accessExpiresAt: string;
    };
    await saveTokens(data);
    return true;
  })();

  try { return await refreshInFlight; }
  finally { refreshInFlight = null; }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const send = async (): Promise<Response> => {
    const tokens = await loadTokens();
    const headers = new Headers(init.headers);
    headers.set('Content-Type', 'application/json');
    if (tokens) headers.set('Authorization', `Bearer ${tokens.accessToken}`);
    return fetch(`${BASE}${path}`, { ...init, headers });
  };

  let res = await send();

  // One retry after a refresh on 401.
  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) throw new ApiError(401, 'Authentication expired');
    res = await send();
  }

  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json() as Promise<T>;
}