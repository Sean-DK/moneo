import { useState } from 'react';
import { Play, Square } from 'lucide-react';
import { useRunningEntry, useRecentEntries, useTick } from './queries';
import { startTimer, stopTimer, MAX_NAME_LENGTH } from './actions';
import { useCategories } from '../categories/queries';
import { useComposerDefaults } from '../reminders/composerStore';
import type { Category, TimeEntry } from '../../lib/db/types';
import { CategoryChips, useEffectiveCategory } from '../categories/CategoryChips';
import { SectionLabel } from '../../components/SectionLabel';
import { DEFAULT_CATEGORY_COLOR } from '../../lib/design/color';

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

  if (running === undefined || !recent || !categories) return <p className="text-muted">Loading…</p>;

  return (
    <div className="flex flex-col gap-4.5">
      <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Time Tracking</h1>

      {running ? <RunningCard entry={running} categories={categories} /> : <StartCard />}

      <div className="border-t border-white/8 pt-1.5">
        <SectionLabel>recent</SectionLabel>
        <ul className="flex flex-col">
          {recent.map((e) => <EntryRow key={e.id} entry={e} categories={categories} />)}
        </ul>
        {recent.length === 0 && <p className="text-[14px] text-muted">No entries yet.</p>}
      </div>
    </div>
  );
}

function RunningCard({ entry, categories }: { entry: TimeEntry; categories: Category[] }) {
  const tick = useTick(true);
  const elapsed = tick - new Date(entry.startedAt).getTime();
  const category = categories.find((c) => c.id === entry.categoryId);

  return (
    <div className="rounded-20 border border-accent/30 bg-timercard px-5.5 pb-6 pt-6.5 text-center shadow-[0_10px_34px_rgba(63,208,196,0.12)]">
      <div className="mb-3.5 inline-flex items-center gap-1.75">
        <span className="h-1.75 w-1.75 rounded-full bg-accent shadow-[0_0_0_4px_rgba(63,208,196,0.2)]" />
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
          tracking · {category?.name ?? 'Uncategorized'}
        </span>
      </div>
      <div className="mb-1 text-[20px] font-semibold text-ink">{entry.name}</div>
      <div className="font-mono text-[52px] leading-[1.05] font-medium tracking-[-0.02em] text-ink tabular-nums">
        {formatDuration(elapsed)}
      </div>
      <div className="mt-1.5 font-mono text-[12px] text-muted">started {timeFmt.format(new Date(entry.startedAt))}</div>
      <button
        onClick={() => void stopTimer()}
        className="mt-5.5 flex w-full items-center justify-center gap-2 rounded-15 border border-danger bg-danger/14 py-3.75 text-[16px] font-bold text-[#F0A49C]"
      >
        <Square size={17} />
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
    <div className="flex flex-col gap-3">
      <div>
        <SectionLabel commented>what are you doing?</SectionLabel>
        <div className="rounded-15 border border-white/10 bg-surface px-4 py-3.75">
          <input
            autoFocus
            value={name}
            maxLength={MAX_NAME_LENGTH}
            placeholder="What are you doing?"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void start()}
            style={{ caretColor: '#3FD0C4' }}
            className="w-full bg-transparent text-[19px] font-semibold text-ink outline-none placeholder:text-muted"
          />
        </div>
      </div>

      <CategoryChips selectedId={categoryId} onSelect={setCategoryId} variant="grid" />

      <button
        onClick={() => void start()}
        disabled={!name.trim()}
        className="flex items-center justify-center gap-2.25 rounded-16 bg-accent py-4.25 text-[17px] font-bold text-ink-on-accent shadow-[0_8px_26px_rgba(63,208,196,0.28)] disabled:opacity-40"
      >
        <Play size={19} strokeWidth={2.6} />
        Start tracking
      </button>
      {error && <p className="text-[13px] text-danger">{error}</p>}
    </div>
  );
}

function EntryRow({ entry, categories }: { entry: TimeEntry; categories: Category[] }) {
  const dur = new Date(entry.endedAt!).getTime() - new Date(entry.startedAt).getTime();
  const category = categories.find((c) => c.id === entry.categoryId);
  return (
    <li className="flex items-center gap-2.75 border-b border-white/6 py-2.75">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: category?.color ?? DEFAULT_CATEGORY_COLOR }} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-medium text-ink">{entry.name}</div>
        <div className="font-mono text-[11px] text-muted">{timeFmt.format(new Date(entry.startedAt))}</div>
      </div>
      <span className="shrink-0 font-mono text-[14px] font-medium text-ink-muted">{formatDuration(dur)}</span>
    </li>
  );
}
