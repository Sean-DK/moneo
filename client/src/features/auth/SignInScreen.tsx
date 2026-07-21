import { useState } from 'react';
import { useAuth } from '../../lib/auth/authStore';

export function SignInScreen() {
  const { signIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-6 px-8 text-center"
      style={{ height: '75vh' }}
    >
      <div>
        <h1 className="text-[28px] font-bold text-ink">Moneo</h1>
        <p className="mt-2 text-[15px] text-muted">
          Sign in to sync your data across devices.
        </p>
      </div>

      <button
        onClick={() => void go()}
        disabled={busy}
        className="w-full max-w-[300px] rounded-14 bg-accent py-4 text-[16px] font-bold text-ink-on-accent disabled:opacity-50"
      >
        {busy ? 'Signing in…' : 'Continue with Google'}
      </button>

      {error && <p className="text-[13px] text-danger">{error}</p>}
    </div>
  );
}