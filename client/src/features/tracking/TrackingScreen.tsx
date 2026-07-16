import { useState } from 'react';
import { useRunningEntry, useRecentEntries, useTick } from './queries';
import { startTimer, stopTimer, MAX_NAME_LENGTH } from './actions';
import { useCategories } from '../categories/queries';
import { useComposerDefaults } from '../reminders/composerStore';
import type { TimeEntry } from '../../lib/db/types';
import { CategoryChips, useEffectiveCategory } from '../categories/CategoryChips';

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

export function TrackingScreen() {
  const running = useRunningEntry();
  const recent = useRecentEntries();
  const categories = useCategories();

  if (running === undefined || !recent || !categories) return <p>Loading…</p>;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
      <h2>Time Tracking</h2>
      {running ? <RunningCard entry={running} /> : <StartCard />}

      <h3 style={{ marginTop: 24, fontSize: 16, color: '#666' }}>Recent</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {recent.map((e) => <EntryRow key={e.id} entry={e} />)}
      </ul>
      {recent.length === 0 && <p style={{ color: '#666' }}>No entries yet.</p>}
    </div>
  );
}

function RunningCard({ entry }: { entry: TimeEntry }) {
  const tick = useTick(true);
  const elapsed = tick - new Date(entry.startedAt).getTime();

  return (
    <div style={{ padding: 16, borderRadius: 12, background: '#EFF6FF', textAlign: 'center' }}>
      <div style={{ fontSize: 14, color: '#666' }}>Tracking</div>
      <div style={{ fontSize: 22, fontWeight: 600, margin: '4px 0' }}>{entry.name}</div>
      <div style={{ fontSize: 40, fontVariantNumeric: 'tabular-nums', margin: '8px 0' }}>
        {formatDuration(elapsed)}
      </div>
      <button onClick={() => void stopTimer()}
        style={{ padding: '10px 24px', fontSize: 16, borderRadius: 8, border: 'none',
          background: '#EF4444', color: 'white', cursor: 'pointer' }}>
        Stop
      </button>
    </div>
  );
}

function StartCard() {
  const defaults = useComposerDefaults();
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(defaults.categoryId);
  const [error, setError] = useState<string | null>(null);
  const { effectiveId } = useEffectiveCategory(categoryId);

  const start = async () => {
    if (!effectiveId) return;
    try {
      await startTimer({ name, categoryId: effectiveId });
      defaults.remember({ priority: defaults.priority, categoryId: effectiveId });
      setName('');
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input
        autoFocus
        value={name}
        maxLength={MAX_NAME_LENGTH}
        placeholder="What are you doing?"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void start()}
        style={{ fontSize: 18, padding: 10 }}
      />
      <CategoryChips selectedId={categoryId} onSelect={setCategoryId} />
      <button onClick={() => void start()} disabled={!name.trim()}
        style={{ padding: '12px', fontSize: 16, borderRadius: 8, border: 'none',
          background: '#10B981', color: 'white', cursor: 'pointer' }}>
        Start timer
      </button>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
    </div>
  );
}

function EntryRow({ entry }: { entry: TimeEntry }) {
  const dur = new Date(entry.endedAt!).getTime() - new Date(entry.startedAt).getTime();
  return (
    <li style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' }}>
      <span style={{ flexGrow: 1 }}>{entry.name}</span>
      <small style={{ color: '#666' }}>
        {timeFmt.format(new Date(entry.startedAt))} · {formatDuration(dur)}
      </small>
    </li>
  );
}