import { useEffect, useState } from 'react';
import { Play, Square, ChartColumn } from 'lucide-react';
import { useRunningEntry, useRecentEntries, useTick } from './queries';
import { stopTimer, MAX_NAME_LENGTH, startTimerAt, planBackdatedStart } from './actions';
import { useCategories } from '../categories/queries';
import { useComposerDefaults } from '../reminders/composerStore';
import type { Category, TimeEntry } from '../../lib/db/types';
import { CategoryChips, useEffectiveCategory } from '../categories/CategoryChips';
import { DEFAULT_CATEGORY_COLOR, lighten } from '../../lib/design/color';
import { formatEntryDuration, type CascadePlan } from './backdateCascade';
import { useNav } from '../../app/navStore';
import { type ActivityPreset } from './presets';
import { AnimatePresence, motion } from 'framer-motion';
import { TrackingPresetPicker } from './TrackingPresetPicker';
import { hexToRgba } from '../mood/checkInTheme';

const BACKDATE_CHIPS: { label: string; minutesAgo: number }[] = [
  { label: 'Now', minutesAgo: 0 },
  { label: '5 min ago', minutesAgo: 5 },
  { label: '10 min ago', minutesAgo: 10 },
  { label: '15 min ago', minutesAgo: 15 },
  { label: '30 min ago', minutesAgo: 30 },
  { label: '1 hour ago', minutesAgo: 60 },
];

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
type Tab = 'recent' | 'presets';

export function TrackingScreen() {
  const running = useRunningEntry();
  const recent = useRecentEntries();
  const categories = useCategories();
  const [tab, setTab] = useState<Tab>('presets');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [presetSeed, setPresetSeed] = useState<{ name: string; categoryId: string } | null>(null);

  if (running === undefined || !recent || !categories) return <p className="p-4 text-muted">Loading…</p>;

  const pickPreset = (preset: ActivityPreset) => {
    const cat = categories.find((c) => c.name === preset.categoryName)
      ?? categories.find((c) => c.isSystem);
    if (!cat) return;
    setPresetSeed({ name: preset.label, categoryId: cat.id });
  };

  const replayEntry = (entry: TimeEntry) => {
    setPresetSeed({ name: entry.name, categoryId: entry.categoryId });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[22px] font-bold text-ink">Time Tracking</h2>
        <button
          onClick={() => useNav.getState().openTimeSummary()}
          aria-label="Time summary"
          className="p-1 text-muted"
        >
          <ChartColumn size={22} />
        </button>
      </div>

      {/* Fixed top: start flow (incl. seeded presets) or running timer */}
      <div className="flex-none pb-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={presetSeed || !running ? 'start' : 'running'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {presetSeed || !running
              ? <StartCard
                  seed={presetSeed}
                  onFlowDone={() => setPresetSeed(null)}
                  onSetCategory={setSelectedCategory}
                  />
              : <RunningCard entry={running} categories={categories} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Fixed tab bar */}
      <div className="flex-none border-b border-white/8 px-4">
        <div style={{ justifyContent: 'space-around' }} className="flex gap-6">
          <TabButton label="Recent" active={tab === 'recent'} onClick={() => setTab('recent')} />
          <TabButton label="Presets" active={tab === 'presets'} onClick={() => setTab('presets')} />
        </div>
      </div>

      {/* Scrolling body */}
      <div className="flex-1 overflow-y-auto pt-4">
        {tab === 'recent' && (
          <ul className="flex flex-col">
            {recent.map((e) => <EntryRow key={e.id} entry={e} categories={categories} onReplay={() => replayEntry(e)}/>)}
            {recent.length === 0 && <p className="text-muted">No entries yet.</p>}
          </ul>
        )}
        <div className={tab === 'presets' ? '' : 'hidden'}>
          <TrackingPresetPicker
            categoryId={selectedCategory}
            onPick={pickPreset} />
        </div>
      </div>
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="pb-2 text-[15px] font-semibold"
      style={{
        color: active ? 'var(--color-accent)' : 'var(--color-muted)',
        borderBottom: active ? '2px solid var(--color-accent)' : '2px solid transparent',
        width: '100%',
      }}
    >
      {label}
    </button>
  );
}

function RunningCard({ entry, categories }: { entry: TimeEntry; categories: Category[] }) {
  const tick = useTick(true);
  const elapsed = tick - new Date(entry.startedAt).getTime();
  const category = categories.find((c) => c.id === entry.categoryId);
  const color = category?.color ?? DEFAULT_CATEGORY_COLOR;

  return (
    <div
      className="rounded-20 border px-5.5 pb-6 pt-6.5 text-center"
      style={{
        borderColor: hexToRgba(color, 0.3),
        boxShadow: `0 10px 34px ${hexToRgba(color, 0.12)}`,
        background: hexToRgba(color, 0.04),
      }}
    >
      <div className="mb-3.5 inline-flex items-center gap-1.75">
        <span
          className="h-1.75 w-1.75 rounded-full"
          style={{ background: color, boxShadow: `0 0 0 4px ${hexToRgba(color, 0.2)}` }}
        />
        <span
          className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: lighten(color, 0.25) }}
        >
          tracking · {category?.name ?? 'Uncategorized'}
        </span>
      </div>
      <div className="mb-1 text-[20px] font-semibold text-ink">{entry.name}</div>
      <div className="font-mono text-[52px] leading-[1.05] font-medium tracking-[-0.02em] text-ink tabular-nums">
        {formatDuration(elapsed)}
      </div>
      <div className="mt-1.5 font-mono text-[12px] text-muted">
        started {timeFmt.format(new Date(entry.startedAt))}
      </div>
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

export function StartCard({ seed, onFlowDone, onSetCategory }: {
  seed: { name: string; categoryId: string } | null;
  onFlowDone?: () => void;
  onSetCategory: (categoryId: string | null) => void;
}) {
  const defaults = useComposerDefaults();
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(defaults.categoryId);
  const [pendingStart, setPendingStart] = useState(false);
  const [confirm, setConfirm] = useState<{ startedAt: Date; plan: CascadePlan } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { effectiveId } = useEffectiveCategory(categoryId);

  // A preset tap seeds name + category and jumps straight to the backdate chips.
  useEffect(() => {
    if (!seed) return;
    setName(seed.name);
    setCategoryId(seed.categoryId);
    setPendingStart(true);
  }, [seed]);

  useEffect(() => {
    onSetCategory(categoryId);
  }, [categoryId]);

  const pickBackdate = async (minutesAgo: number) => {
    if (!effectiveId) return;
    const startedAt = new Date(Date.now() - minutesAgo * 60_000);
    const plan = await planBackdatedStart(startedAt);
    if (plan.destructive) {
      setConfirm({ startedAt, plan });
    } else {
      await commit(startedAt, plan);
    }
  };

  const commit = async (startedAt: Date, plan: CascadePlan) => {
    if (!effectiveId) return;
    try {
      await startTimerAt({ name, categoryId: effectiveId }, startedAt, plan);
      defaults.remember({ priority: defaults.priority, categoryId: effectiveId });
      setConfirm(null);
      setError(null);
      onFlowDone?.();
      // Deliberately NOT resetting name/pendingStart — the header swaps to
      // RunningCard and unmounts this component, so resetting would only
      // flash the input view for a frame first.
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPendingStart(false);   // on failure, fall back to the input view
    }
  };

  const cancelFlow = () => {
    setPendingStart(false);
    setConfirm(null);
    setName('');
    onFlowDone?.();
  };

  if (pendingStart) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[15px] font-semibold text-ink">When did you start "{name}"?</p>
        <div className="grid grid-cols-2 gap-2">
          {BACKDATE_CHIPS.map((c) => (
            <button
              key={c.minutesAgo}
              onClick={() => void pickBackdate(c.minutesAgo)}
              className="rounded-14 border border-accent/40 bg-accent/10 px-3 py-3 text-[14px] font-semibold text-accent"
            >
              {c.label}
            </button>
          ))}
        </div>
        <button onClick={cancelFlow} className="text-[13px] text-muted">Cancel</button>

        {confirm && (
          <ConfirmDialog
            plan={confirm.plan}
            onConfirm={() => void commit(confirm.startedAt, confirm.plan)}
            onCancel={() => setConfirm(null)}
          />
        )}
        {error && <p className="text-[13px] text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        value={name}
        maxLength={MAX_NAME_LENGTH}
        placeholder="What are you doing?"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && name.trim() && setPendingStart(true)}
        className="rounded-14 border border-white/10 bg-surface px-3 py-2.5 text-[18px] text-ink outline-none"
      />
      <CategoryChips selectedId={categoryId} onSelect={setCategoryId} variant="grid" />
      {/* Button is unnecessary, just let the user hit enter on the keyboard
      <button
        onClick={() => name.trim() && setPendingStart(true)}
        disabled={!name.trim()}
        className="rounded-14 bg-success py-3 font-bold text-ink-on-accent disabled:opacity-40"
      >
        Start timer
      </button>*/}
      {error && <p className="text-[13px] text-danger">{error}</p>}
    </div>
  );
}

function ConfirmDialog({ plan, onConfirm, onCancel }: {
  plan: CascadePlan; onConfirm: () => void; onCancel: () => void;
}) {
  const now = new Date();
  const list = plan.toDelete
    .map((e) => `${e.name} - ${formatEntryDuration(e, now)}`)
    .join(', ');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="w-full max-w-sm rounded-2xl bg-base p-5">
        <p className="text-[15px] font-semibold text-ink">
          This will delete {plan.toDelete.length} {plan.toDelete.length === 1 ? 'entry' : 'entries'}:
        </p>
        <p className="mt-1.5 text-[14px] text-muted">{list}</p>
        <div className="mt-4 flex gap-2">
          <button onClick={onCancel} className="flex-1 rounded-14 border border-white/15 py-2.5 font-semibold text-ink">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 rounded-14 border border-danger/40 bg-danger/10 py-2.5 font-bold text-danger">
            Delete &amp; Start
          </button>
        </div>
      </div>
    </div>
  );
}

function EntryRow({ entry, categories, onReplay}: { entry: TimeEntry; categories: Category[], onReplay: () => void }) {
  const dur = new Date(entry.endedAt!).getTime() - new Date(entry.startedAt).getTime();
  const category = categories.find((c) => c.id === entry.categoryId);
  return (
    <li
      className="flex items-center gap-2.75 border-b border-white/6 py-2.75"
      onClick={() => useNav.getState().editEntry(entry.id)}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: category?.color ?? DEFAULT_CATEGORY_COLOR }} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-medium text-ink">{entry.name}</div>
        <div className="font-mono text-[11px] text-muted">{timeFmt.format(new Date(entry.startedAt))}</div>
      </div>
      <span className="shrink-0 font-mono text-[14px] font-medium text-ink-muted">{formatDuration(dur)}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onReplay(); }}
        aria-label={`Start ${entry.name} again`}
        className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/10"
      >
        <Play size={13} strokeWidth={2.5} className="text-accent" style={{ marginLeft: 1 }} />
      </button>
    </li>
  );
}