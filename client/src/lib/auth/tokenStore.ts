import { SecureStorage } from '@aparajita/capacitor-secure-storage';

const ACCESS_KEY = 'moneo.accessToken';
const REFRESH_KEY = 'moneo.refreshToken';
const EXPIRES_KEY = 'moneo.accessExpiresAt';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;   // ISO
}

export async function saveTokens(t: StoredTokens): Promise<void> {
  await SecureStorage.set(ACCESS_KEY, t.accessToken);
  await SecureStorage.set(REFRESH_KEY, t.refreshToken);
  await SecureStorage.set(EXPIRES_KEY, t.accessExpiresAt);
}

export async function loadTokens(): Promise<StoredTokens | null> {
  try {
    const [a, r, e] = await Promise.all([
      SecureStorage.get(ACCESS_KEY),
      SecureStorage.get(REFRESH_KEY),
      SecureStorage.get(EXPIRES_KEY),
    ]);
    if (typeof a !== 'string' || typeof r !== 'string' || typeof e !== 'string') return null;
    return { accessToken: a, refreshToken: r, accessExpiresAt: e };
  } catch {
    return null;   // missing keys or storage unavailable → treat as signed out
  }
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStorage.remove(ACCESS_KEY),
    SecureStorage.remove(REFRESH_KEY),
    SecureStorage.remove(EXPIRES_KEY),
  ]);
}