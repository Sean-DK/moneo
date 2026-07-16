import { useState } from 'react';
import { useSettings } from '../settings/queries';
import { useCategories } from '../categories/queries';
import { useComposerDefaults } from './composerStore';
import { createReminder, undoCreate, useNow, MAX_NOTE_LENGTH, type CreatedReminder } from './actions';
import {
  DAY_LABELS, SLOT_LABELS, RELATIVE_CHIPS, relativeLabel,
  availableDayChips, availableSlots, resolveDay, resolveSlotOnDay, resolveRelative,
  smartSuggestions, type DayChip, type Slot,
} from './timeResolution';
import { Priority } from '../../lib/db/types';

const PRIORITY_LABELS: [Priority, string][] = [
  [Priority.None, '–'], [Priority.Low, 'Low'], [Priority.Medium, 'Med'],
  [Priority.High, 'High'], [Priority.Urgent, 'Urgent'],
];

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
  const [day, setDay] = useState<DayChip | null>(null);
  const [customAt, setCustomAt] = useState('');
  const [lastCreated, setLastCreated] = useState<CreatedReminder | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!settings || !categories) return <p>Loading…</p>;

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
      setNote(''); setDay(null); setCustomAt(''); setError(null);
      setLastCreated(created);
      setTimeout(() => setLastCreated((c) => (c === created ? null : c)), 6000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const chipStyle = (active: boolean) => ({
    padding: '6px 12px', borderRadius: 16, cursor: 'pointer',
    border: active ? '2px solid #3B82F6' : '1px solid #ccc',
    background: active ? '#EFF6FF' : 'white',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input
        autoFocus
        value={note}
        maxLength={MAX_NOTE_LENGTH}
        placeholder="Remind me to…"
        onChange={(e) => setNote(e.target.value)}
        style={{ fontSize: 18, padding: 8 }}
      />

      {/* Priority: tap chips with sticky defaults (None hidden) */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {PRIORITY_LABELS.filter(([p]) => p !== Priority.None).map(([p, label]) => (
          <button key={p} style={chipStyle(priority === p)} onClick={() => setPriority(p)}>{label}</button>
        ))}
      </div>

      {/* Category: General highlighted by default, no "none" option */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {categories.map((c) => (
          <button key={c.id} style={chipStyle(effectiveCategoryId === c.id)} onClick={() => setCategoryId(c.id)}>
            {c.name}
          </button>
        ))}
      </div>

      {/* Smart suggestions: complete one-tap options */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {smartSuggestions(settings, now).map((s) => (
          <button key={s.presetUsed} style={chipStyle(false)} disabled={!note.trim()}
            onClick={() => void commit(s.at, s.presetUsed)}>
            ⚡ {s.label} · {fmt.format(s.at)}
          </button>
        ))}
      </div>

      {/* Step 1: day */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {availableDayChips(settings, now).map((chip) => (
          <button key={chip} style={chipStyle(day === chip)} onClick={() => setDay(chip)}>
            {DAY_LABELS[chip]}
          </button>
        ))}
      </div>

      {/* Step 2: depends on day choice */}
      {day && day !== 'later' && day !== 'custom' && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {availableSlots(resolveDay(day, now), settings, now).map((slot: Slot) => {
            const at = resolveSlotOnDay(resolveDay(day, now), settings, slot);
            return (
              <button key={slot} style={chipStyle(false)} disabled={!note.trim()}
                onClick={() => void commit(at, `${day}.${slot}`)}>
                {SLOT_LABELS[slot]} · {fmt.format(at)}
              </button>
            );
          })}
        </div>
      )}
      {day === 'later' && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {RELATIVE_CHIPS.map((m) => {
            const at = resolveRelative(m, now);
            return (
              <button key={m} style={chipStyle(false)} disabled={!note.trim()}
                onClick={() => void commit(at, `later.${m}`)}>
                {relativeLabel(m)} · {fmt.format(at)}
              </button>
            );
          })}
        </div>
      )}
      {day === 'custom' && (
        <div style={{ display: 'flex', gap: 6 }}>
          <input type="datetime-local" value={customAt} onChange={(e) => setCustomAt(e.target.value)} />
          <button disabled={!note.trim() || !customAt}
            onClick={() => void commit(new Date(customAt), 'custom')}>
            Set
          </button>
        </div>
      )}

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      {/* Undo snackbar */}
      {lastCreated && (
        <div style={{
          position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          background: '#1F2937', color: 'white', padding: '10px 16px', borderRadius: 8,
          display: 'flex', gap: 12, alignItems: 'center',
        }}>
          <span>Reminder set for {fmt.format(new Date(lastCreated.reminder.remindAt))}</span>
          <button onClick={() => { void undoCreate(lastCreated); setLastCreated(null); }}
            style={{ color: '#60A5FA', background: 'none', border: 'none', cursor: 'pointer' }}>
            Undo
          </button>
        </div>
      )}
    </div>
  );
}