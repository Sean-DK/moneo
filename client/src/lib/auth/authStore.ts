import { create } from 'zustand';
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';
import { saveTokens, loadTokens, clearTokens } from './tokenStore';
import { db } from '../db/db';
import { sync } from '../sync/engine';

export type AuthState = 'loading' | 'signedOut' | 'signedIn' | 'expired';

interface AuthStore {
  state: AuthState;
  email: string | null;
  displayName: string | null;
  init: () => Promise<void>;
  signIn: () => Promise<void>;
  prepareSignOut: () => Promise<number>;
  signOut: () => Promise<void>;
  markExpired: () => void;
}

const DEV_BYPASS = import.meta.env.VITE_DEV_AUTH_BYPASS === 'true';

export const useAuth = create<AuthStore>((set) => ({
  state: 'loading',
  email: null,
  displayName: null,

  init: async () => {
    if (DEV_BYPASS) {
      set({ state: 'signedIn', email: 'dev@local', displayName: 'Dev User' });
      return;
    }
    try {
      const tokens = await loadTokens();
      set({ state: tokens ? 'signedIn' : 'signedOut' });
    } catch {
      set({ state: 'signedOut' })
    }
  },

  signIn: async () => {
    const result = await GoogleSignIn.signIn();

    const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: result.idToken }),
    });
    if (!res.ok) throw new Error('Sign-in failed');

    const data = await res.json() as {
      accessToken: string; refreshToken: string; accessExpiresAt: string;
      email: string; displayName: string;
    };
    await saveTokens(data);
    set({ state: 'signedIn', email: data.email, displayName: data.displayName });
    void sync();
  },

  prepareSignOut: async () => {
    await sync();               // never throws — returns a result object
    return db.outbox.count();
  },

  signOut: async () => {
    await clearTokens();
    await GoogleSignIn.signOut().catch(() => {});
    await db.delete();
    window.location.reload();
  },

  markExpired: () => set({ state: 'expired' }),
}));