import { useState } from 'react';
import { useOpenTodos, useCompletedTodos, type OpenTodo } from './queries';
import { createTodo, completeTodo, uncompleteTodo, MAX_NOTE_LENGTH } from './actions';
import { useCategories } from '../categories/queries';
import { useComposerDefaults } from '../reminders/composerStore';
import { Priority, ReminderStatus, type Todo } from '../../lib/db/types';
import { db } from '../../lib/db/db';
import { CategoryChips, useEffectiveCategory } from '../categories/CategoryChips';

const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.None]: '', [Priority.Low]: 'Low', [Priority.Medium]: 'Med',
  [Priority.High]: 'High', [Priority.Urgent]: 'Urgent',
};

const timeFmt = new Intl.DateTimeFormat(undefined, {
  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
});

export function TodosScreen() {
  const open = useOpenTodos();
  const categories = useCategories();
  const [showHistory, setShowHistory] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const restore = async (todo: Todo) => {
    await uncompleteTodo(todo.id);
    const deadReminder = await db.reminders
      .filter((r) => r.todoId === todo.id && !r.isDeleted && r.status !== ReminderStatus.Pending)
      .first();
    if (deadReminder) {
      setNotice("Task restored — its reminder was already cancelled and won't fire again.");
      setTimeout(() => setNotice(null), 6000);
    }
  };

  if (!open || !categories) return <p>Loading…</p>;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
      <h2>To Do</h2>
      <NewTodoRow />
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {open.map((t) => <TodoRow key={t.id} todo={t} />)}
      </ul>
      {open.length === 0 && <p style={{ color: '#666' }}>Nothing to do 🎉</p>}

      <button onClick={() => setShowHistory(!showHistory)}
        style={{ marginTop: 16, background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer' }}>
        {showHistory ? 'Hide history' : 'Show completed'}
      </button>
      {showHistory && <HistoryList onRestore={restore} />}

      {notice && (
        <div style={{
          position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          background: '#1F2937', color: 'white', padding: '10px 16px', borderRadius: 8,
          maxWidth: 360, textAlign: 'center',
        }}>
          {notice}
        </div>
      )}
    </div>
  );
}

function NewTodoRow() {
  const defaults = useComposerDefaults();
  const [note, setNote] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(defaults.categoryId);
  const [error, setError] = useState<string | null>(null);
  const { effectiveId } = useEffectiveCategory(categoryId);

  const submit = async () => {
    if (!effectiveId) return;
    try {
      await createTodo({ note, priority: defaults.priority, categoryId: effectiveId });
      defaults.remember({ priority: defaults.priority, categoryId: effectiveId });
      setNote('');
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input
        value={note}
        maxLength={MAX_NOTE_LENGTH}
        placeholder="Add a task…"
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void submit()}
        style={{ fontSize: 16, padding: 8, width: '100%', boxSizing: 'border-box' }}
      />
      <CategoryChips selectedId={categoryId} onSelect={setCategoryId} />
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
    </div>
  );
}

function TodoRow({ todo }: { todo: OpenTodo }) {
  return (
    <li style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' }}>
      <input type="checkbox" checked={false} onChange={() => void completeTodo(todo.id)} />
      <span style={{ flexGrow: 1 }}>{todo.note}</span>
      {todo.remindAt && (
        <small style={{ color: '#666' }}>🔔 {timeFmt.format(new Date(todo.remindAt))}</small>
      )}
      {todo.priority !== Priority.None && (
        <small style={{ color: '#B45309' }}>{PRIORITY_LABELS[todo.priority]}</small>
      )}
    </li>
  );
}

function HistoryList({ onRestore }: { onRestore: (todo: Todo) => void }) {
  const completed = useCompletedTodos();
  if (!completed) return null;
  return (
    <ul style={{ listStyle: 'none', padding: 0, opacity: 0.6 }}>
      {completed.map((t) => (
        <li key={t.id} style={{ display: 'flex', gap: 10, padding: '6px 0' }}>
          <span style={{ textDecoration: 'line-through', flexGrow: 1 }}>{t.note}</span>
          <button onClick={() => onRestore(t)}
            style={{ background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer' }}>
            Restore
          </button>
        </li>
      ))}
    </ul>
  );
}