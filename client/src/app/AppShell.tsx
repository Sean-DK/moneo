import { useNav, type Tab } from './navStore';
import { RemindersScreen } from '../features/reminders/RemindersScreen';
import { TodosScreen } from '../features/todos/TodosScreen';
import { TrackingScreen } from '../features/tracking/TrackingScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'reminders', label: 'Remind', icon: '⏰' },
  { id: 'todos', label: 'To Do', icon: '✓' },
  { id: 'tracking', label: 'Track', icon: '⏱' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];

export function AppShell() {
  const { tab, go } = useNav();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <main style={{ flexGrow: 1, overflowY: 'auto', paddingBottom: 64 }}>
        {tab === 'reminders' && <RemindersScreen />}
        {tab === 'todos' && <TodosScreen />}
        {tab === 'tracking' && <TrackingScreen />}
        {tab === 'settings' && <SettingsScreen />}
      </main>

      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 60,
        display: 'flex', borderTop: '1px solid #e5e7eb', background: 'white',
        paddingBottom: 'env(safe-area-inset-bottom)', // avoid Android gesture bar
      }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => go(t.id)}
            style={{
              flex: 1, border: 'none', background: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 2,
              color: tab === t.id ? '#3B82F6' : '#9ca3af',
              fontSize: 11, fontWeight: tab === t.id ? 600 : 400,
            }}
          >
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}