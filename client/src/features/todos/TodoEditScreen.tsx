import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Bell, Check, Trash2 } from 'lucide-react';
import { db } from '../../lib/db/db';
import { useSettings } from '../settings/queries';
import { useCategories } from '../categories/queries';
import { CategoryChips } from '../categories/CategoryChips';
import { ReminderTimePicker } from '../reminders/ReminderTimePicker';
import { useNow, MAX_NOTE_LENGTH } from '../reminders/actions';
import {
  completeTodo, deleteTodo, editTodo,
  getLinkedReminder, createReminderForTodo, cancelReminderKeepTodo,
} from './actions';
import { Priority } from '../../lib/db/types';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../../lib/design/priority';
import { SectionLabel } from '../../components/SectionLabel';
import { Chip } from '../../components/Chip';
import { useNav } from '../../app/navStore';

const PRIORITY_ORDER: Priority[] = [Priority.Low, Priority.Medium, Priority.High, Priority.Urgent];
const fmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });

export function TodoEditScreen({ todoId }: { todoId: string }) {
  const { go } = useNav();
  const settings = useSettings();
  const categories = useCategories();
  const now = useNow();

  const todo = useLiveQuery(() => db.todos.get(todoId), [todoId]);
  const linkedReminder = useLiveQuery(
    () => getLinkedReminder(todoId),
    [todoId],
  );

  const [note, setNote] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  if (!settings || !categories || todo === undefined) return <p className="text-muted">Loading…</p>;
  if (todo === null) { go('todos'); return null; } // deleted out from under us

  // Local edits fall back to the stored value until touched.
  const noteVal = note ?? todo.note;

  const saveNote = () => {
    if (note !== null && note.trim() !== todo.note) void editTodo(todo.id, { note });
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <SectionLabel commented>edit task</SectionLabel>
        <div className="rounded-15 border border-white/10 bg-surface px-4 py-2.75">
          <input
            value={noteVal}
            maxLength={MAX_NOTE_LENGTH}
            onChange={(e) => setNote(e.target.value)}
            onBlur={saveNote}
            style={{ caretColor: '#3FD0C4' }}
            className="w-full bg-transparent text-[19px] font-semibold text-ink outline-none"
          />
        </div>
      </div>

      {/* Done / Delete */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => { void completeTodo(todo.id); go('todos'); }}
          className="flex items-center justify-center gap-2 rounded-14 border border-success/40 bg-success/10 py-2.5 font-bold text-success"
        >
          <Check size={16} /> Done
        </button>
        <button
          onClick={() => { void deleteTodo(todo.id); go('todos'); }}
          className="flex items-center justify-center gap-2 rounded-14 border border-danger/40 bg-danger/10 py-2.5 font-bold text-danger"
        >
          <Trash2 size={16} /> Delete
        </button>
      </div>

      <div>
        <SectionLabel commented>priority</SectionLabel>
        <div className="grid grid-cols-4 gap-2">
          {PRIORITY_ORDER.map((p) => (
            <Chip key={p} selected={todo.priority === p}
              onClick={() => void editTodo(todo.id, { priority: p })} color={PRIORITY_COLORS[p]}>
              {PRIORITY_LABELS[p]}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel commented>category</SectionLabel>
        <CategoryChips
          selectedId={todo.categoryId}
          onSelect={(id) => void editTodo(todo.id, { categoryId: id })}
          variant="grid"
        />
      </div>

      {/* Reminder section: Cancel (if linked) or Create */}
      <div>
        <SectionLabel commented>reminder</SectionLabel>
        {linkedReminder ? (
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={() => void cancelReminderKeepTodo(linkedReminder.id)}
              className="w-full rounded-14 border py-2.75 border-caution/40 bg-caution/10 font-bold text-caution"
            >
              Cancel Reminder
            </button>
            <span className="flex items-center gap-1.5 font-mono text-[13px] text-muted">
              <Bell size={13} />
              {fmt.format(new Date(linkedReminder.remindAt))}
            </span>
          </div>
        ) : showCreate ? (
          <div className="flex flex-col gap-4">
            <ReminderTimePicker
              settings={settings}
              now={now}
              enabled
              showSmartSuggestions={false}
              onPick={(at, presetUsed) => {
                void createReminderForTodo(
                  { id: todo.id, note: todo.note, priority: todo.priority, categoryId: todo.categoryId },
                  at, presetUsed,
                );
                setShowCreate(false);
              }}
            />
          </div>
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full rounded-14 border border-accent/40 bg-accent/10 py-2.75 font-bold text-accent"
          >
            Create Reminder
          </button>
        )}
      </div>
    </div>
  );
}