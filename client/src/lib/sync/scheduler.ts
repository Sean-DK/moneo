import { sync } from './engine';

/** Fire-and-forget sync; failures are logged, never thrown at callers. */
export function requestSync(): void {
  void sync().then((r) => {
    if (!r.ok) console.warn(`sync failed: ${r.error}`);
  });
}

export function startSyncScheduler(): () => void {
  requestSync(); // once at startup

  const onOnline = () => requestSync();
  const onVisible = () => document.visibilityState === 'visible' && requestSync();
  const interval = setInterval(requestSync, 5 * 60_000);

  window.addEventListener('online', onOnline);
  document.addEventListener('visibilitychange', onVisible);

  return () => {
    clearInterval(interval);
    window.removeEventListener('online', onOnline);
    document.removeEventListener('visibilitychange', onVisible);
  };
}