import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Trash2, ChevronLeft } from 'lucide-react';
import { db } from '../../lib/db/db';
import { editEntry, deleteEntry, MAX_NAME_LENGTH } from './actions';
import { CategoryChips } from '../categories/CategoryChips';
import { SectionLabel } from '../../components/SectionLabel';
import { useNav } from '../../app/navStore';

/** Date <-> "YYYY-MM-DDTHH:mm" for datetime-local inputs (local time, no UTC shift). */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TimeEntryEditScreen({ entryId }: { entryId: string }) {
  const { closeEntryEdit } = useNav();
  const entry = useLiveQuery(() => db.timeEntries.get(entryId), [entryId]);

  const [name, setName] = useState('');
  const [startedAt, setStartedAt] = useState('');
  const [endedAt, setEndedAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Seed local state once, when the entry first loads.
  useEffect(() => {
    if (!entry || loaded) return;
    setName(entry.name);
    setStartedAt(toLocalInput(entry.startedAt));
    setEndedAt(entry.endedAt ? toLocalInput(entry.endedAt) : '');
    setLoaded(true);
  }, [entry, loaded]);

  if (entry === undefined) return <p className="p-4 text-muted">Loading…</p>;
  if (entry === null) { closeEntryEdit(); return null; }   // deleted elsewhere

  const isRunning = entry.endedAt === null;

  const save = async () => {
    try {
      await editEntry(entry.id, {
        name,
        startedAt: new Date(startedAt),
        // Don't send endedAt for a running timer — leave it null.
        ...(isRunning ? {} : { endedAt: new Date(endedAt) }),
      });
      setError(null);
      closeEntryEdit();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <button onClick={closeEntryEdit} aria-label="Back" className="p-1 text-muted">
          <ChevronLeft size={22} />
        </button>
        <button
          onClick={() => { void deleteEntry(entry.id); closeEntryEdit(); }}
          aria-label="Delete entry"
          className="p-1 text-danger"
        >
          <Trash2 size={20} />
        </button>
      </div>

      <div>
        <SectionLabel commented>activity</SectionLabel>
        <input
          value={name}
          maxLength={MAX_NAME_LENGTH}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-15 border border-white/10 bg-surface px-4 py-2.75 text-[19px] font-semibold text-ink outline-none"
        />
      </div>

      <div>
        <SectionLabel commented>category</SectionLabel>
        <CategoryChips
          selectedId={entry.categoryId}
          onSelect={(id) => void editEntry(entry.id, { categoryId: id })}
          variant="grid"
        />
      </div>

      <div>
        <SectionLabel commented>started</SectionLabel>
        <input
          type="datetime-local"
          value={startedAt}
          onChange={(e) => setStartedAt(e.target.value)}
          style={{ colorScheme: 'dark' }}
          className="w-full rounded-14 border border-white/10 bg-surface px-3 py-2.5 text-[15px] text-ink outline-none"
        />
      </div>

      {isRunning ? (
        <p className="text-[13px] text-muted">
          This timer is still running — stop it to set an end time.
        </p>
      ) : (
        <div>
          <SectionLabel commented>ended</SectionLabel>
          <input
            type="datetime-local"
            value={endedAt}
            onChange={(e) => setEndedAt(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className="w-full rounded-14 border border-white/10 bg-surface px-3 py-2.5 text-[15px] text-ink outline-none"
          />
        </div>
      )}

      {error && <p className="text-[13px] text-danger">{error}</p>}

      <button
        onClick={() => void save()}
        className="mt-2 rounded-14 bg-accent py-3.5 text-[16px] font-bold text-ink-on-accent"
      >
        Save
      </button>
    </div>
  );
}