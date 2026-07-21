import { CheckSquare, Timer, Smile, SettingsIcon, Bell } from 'lucide-react';
import { useNav, type Tab } from './navStore';
import { RemindersScreen } from '../features/reminders/RemindersScreen';
import { TodosScreen } from '../features/todos/TodosScreen';
import { TrackingScreen } from '../features/tracking/TrackingScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { TodoEditScreen } from '../features/todos/TodoEditScreen';
import { useAndroidBack } from './useAndroidBack';
import { CheckInFlow } from '../features/mood/CheckInFlow';
import { MoodScreen } from '../features/mood/MoodScreen';
import { TimeEntryEditScreen } from '../features/tracking/TimeEntryEditScreen';
import { useAuth } from '../lib/auth/authStore';
import { useEffect } from 'react';
import { SignInScreen } from '../features/auth/SignInScreen';
import { SyncPausedBanner } from '../features/auth/SyncPausedBanner';

const SIDE_TABS: { id: Tab; label: string; icon: typeof CheckSquare }[] = [
  { id: 'time', label: 'Time', icon: Timer },
  { id: 'todos', label: 'To Do', icon: CheckSquare },
  { id: 'mood', label: 'Mood', icon: Smile },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export function AppShell() {
  useAndroidBack();
  const { tab, editingTodoId, editingEntryId, checkInDate } = useNav();
  const authState = useAuth((s) => s.state);
  const init = useAuth((s) => s.init);

  useEffect(() => { void init(); }, [init]);

  if (authState === 'loading') {
    return <div className="flex h-full items-center justify-center text-muted">Loading…</div>;
  }

  if (authState === 'signedOut') {
    return <SignInScreen />;
  }

  // signedIn or expired — the app runs either way; expired just shows the banner.
  return (
    <div className="flex h-svh flex-col bg-canvas">
      {authState === 'expired' && <SyncPausedBanner />}
      <main
        className="flex-1 overflow-y-auto px-4 pt-2"
        style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }}
      >
        {tab === 'reminders' && <RemindersScreen />}
        {tab === 'todos' && (editingTodoId ? <TodoEditScreen todoId={editingTodoId} /> : <TodosScreen />)}
        {tab === 'time' && (editingEntryId ? <TimeEntryEditScreen entryId={editingEntryId} /> : <TrackingScreen />)}
        {tab === 'mood' && (checkInDate ? <CheckInFlow moodDate={checkInDate} /> : <MoodScreen />)}
        {tab === 'settings' && <SettingsScreen />}
      </main>
      <BottomNav />
    </div>
  );
}

function BottomNav() {
  const { tab, go } = useNav();
  const left = SIDE_TABS.slice(0, 2);
  const right = SIDE_TABS.slice(2);

  const tabButton = (t: (typeof SIDE_TABS)[number]) => {
    const Icon = t.icon;
    const active = tab === t.id;
    return (
      <button
        key={t.id}
        onClick={() => go(t.id)}
        className="flex flex-1 flex-col items-center justify-center gap-1 py-2"
        style={{ color: active ? 'var(--color-accent)' : 'var(--muted)' }}
      >
        <Icon size={20} />
        <span className="text-[10px]" style={{ fontWeight: active ? 600 : 400 }}>{t.label}</span>
      </button>
    );
  };

  const fabActive = tab === 'reminders';

  return (
    <nav
      className="fixed inset-x-0 bottom-0 flex items-stretch border-t border-white/8 bg-surface"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {left.map(tabButton)}

      {/* Center FAB → selects the Reminders tab */}
      <div className="relative flex w-16 shrink-0 items-start justify-center">
        <button
          onClick={() => go('reminders')}
          aria-label="Reminders"
          className="absolute -top-5 flex h-15 w-15 items-center justify-center rounded-full text-ink-on-accent transition-transform active:scale-95"
          style={{
            background: 'var(--color-accent)',
            boxShadow: fabActive
              ? '0 4px 20px rgba(63,208,196,0.55)'
              : '0 4px 16px rgba(63,208,196,0.35)',
          }}
        >
          <Bell size={24} strokeWidth={2.5} />
        </button>
      </div>

      {right.map(tabButton)}
    </nav>
  );
}