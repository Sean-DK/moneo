import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../../lib/auth/authStore';

export function SyncPausedBanner() {
  const { signIn } = useAuth();
  const [busy, setBusy] = useState(false);

  const reauth = async () => {
    setBusy(true);
    try { await signIn(); } catch { /* stay expired; user can retry */ }
    finally { setBusy(false); }
  };

  return (
    <button
      onClick={() => void reauth()}
      disabled={busy}
      className="flex w-full items-center justify-center gap-2 border-b border-warning/30 bg-warning/12 py-2 text-[13px] font-semibold text-warning"
    >
      <AlertCircle size={14} />
      {busy ? 'Signing in…' : 'Sync paused — tap to sign in'}
    </button>
  );
}