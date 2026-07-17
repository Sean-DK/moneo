import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useSettings } from '../settings/queries';
import { useCategories } from '../categories/queries';
import { CategoryChips } from '../categories/CategoryChips';
import { useComposerDefaults } from './composerStore';
import { createReminder, undoCreate, useNow, MAX_NOTE_LENGTH, type CreatedReminder } from './actions';
import { Priority } from '../../lib/db/types';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../../lib/design/priority';
import { SectionLabel } from '../../components/SectionLabel';
import { Chip } from '../../components/Chip';
import { Snackbar } from '../../components/Snackbar';
import { ReminderTimePicker } from './ReminderTimePicker';

const PRIORITY_ORDER: Priority[] = [Priority.Low, Priority.Medium, Priority.High, Priority.Urgent];

const fmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'short', hour: 'numeric', minute: '2-digit',
});

export function ReminderComposer() {
  const settings = useSettings();
  const categories = useCategories();
  const defaults = useComposerDefaults();
  const now = useNow();

  const [note, setNote] = useState('');
  const [priority, setPriority] = useState(defaults.priority);
  const [categoryId, setCategoryId] = useState<string | null>(defaults.categoryId);
  const [lastCreated, setLastCreated] = useState<CreatedReminder | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!settings || !categories) return <p className="text-muted">Loading…</p>;

  // Resolve the effective category: chosen chip, else General (system), else first.
  const system = categories.find((c) => c.isSystem);
  const stillExists = categoryId !== null && categories.some((c) => c.id === categoryId);
  const effectiveCategoryId = (stillExists ? categoryId : null) ?? system?.id ?? categories[0]?.id ?? null;

  const commit = async (remindAt: Date, presetUsed: string) => {
    if (!effectiveCategoryId) {
      setError('No category available');
      return;
    }
    try {
      const created = await createReminder({
        note, priority, categoryId: effectiveCategoryId, remindAt, presetUsed,
      });
      defaults.remember({ priority, categoryId: effectiveCategoryId });
      setNote(''); setError(null);
      setLastCreated(created);
      setTimeout(() => setLastCreated((c) => (c === created ? null : c)), 6000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <SectionLabel commented>new reminder</SectionLabel>
        <div
          style={{ display: 'flex' }}
          className="rounded-15 border border-white/10 bg-surface px-4 py-2.75">
          <input
            autoFocus
            value={note}
            maxLength={MAX_NOTE_LENGTH}
            placeholder="Remind me to…"
            onChange={(e) => setNote(e.target.value)}
            style={{ caretColor: '#3FD0C4' }}
            className="w-full bg-transparent text-[19px] font-semibold text-ink outline-none"
          />
          <div
            style={{ alignContent: 'center' }}
            className="mt-1 text-right font-mono text-[11px] text-faint">
            {note.length}/{MAX_NOTE_LENGTH}
          </div>
        </div>
      </div>

      <div>
        <SectionLabel commented>priority</SectionLabel>
        <div className="grid grid-cols-4 gap-2">
          {PRIORITY_ORDER.map((p) => (
            <Chip key={p} selected={priority === p} onClick={() => setPriority(p)} color={PRIORITY_COLORS[p]}>
              {PRIORITY_LABELS[p]}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel commented>category</SectionLabel>
        <CategoryChips selectedId={categoryId} onSelect={setCategoryId} variant="grid" />
      </div>

      <ReminderTimePicker
        settings={settings}
        now={now}
        enabled={!note.trim() ? false : true}
        onPick={(at, presetUsed) => void commit(at, presetUsed)}
      />

      {error && <p className="text-[13px] text-danger">{error}</p>}

      {lastCreated && (
        <Snackbar
          icon={Bell}
          message={
            <>
              Reminder set ·{' '}
              <span className="font-mono text-ink-muted">{fmt.format(new Date(lastCreated.reminder.remindAt))}</span>
            </>
          }
          action={{
            label: 'UNDO',
            onClick: () => { void undoCreate(lastCreated); setLastCreated(null); },
          }}
        />
      )}
    </div>
  );
}
