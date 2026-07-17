import { useRef, useState } from 'react';
import { Bell, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useOpenTodos, useCompletedTodos, type OpenTodo } from './queries';
import { createTodo, completeTodo, uncompleteTodo, MAX_NOTE_LENGTH, deleteTodo, type DeletedTodo, undoDeleteTodo } from './actions';
import { useCategories } from '../categories/queries';
import { useComposerDefaults } from '../reminders/composerStore';
import { Priority, ReminderStatus, type Category, type Todo } from '../../lib/db/types';
import { db } from '../../lib/db/db';
import { CategoryChips, useEffectiveCategory } from '../categories/CategoryChips';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../../lib/design/priority';
import { DEFAULT_CATEGORY_COLOR, tint } from '../../lib/design/color';
import { Snackbar } from '../../components/Snackbar';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useNav } from '../../app/navStore';

const timeFmt = new Intl.DateTimeFormat(undefined, {
  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
});

export function TodosScreen() {
  const open = useOpenTodos();
  const categories = useCategories();
  const [showHistory, setShowHistory] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<DeletedTodo | null>(null);
  const deletedTimer = useRef<number | null>(null);

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

  const handleDeleted = (d: DeletedTodo) => {
    setDeleted(d);
    if (deletedTimer.current) clearTimeout(deletedTimer.current);
    deletedTimer.current = window.setTimeout(() => setDeleted(null), 6000);
  };

  if (!open || !categories) return <p className="text-muted">Loading…</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">To Do</h1>

      <NewTodoRow />

      <ul className="flex flex-col">
        {open.map((t) => <TodoRow key={t.id} todo={t} categories={categories} onDeleted={handleDeleted} />)}
      </ul>
      {open.length === 0 && <p className="text-[14px] text-muted">Nothing to do 🎉</p>}

      <div className="border-t border-white/8 px-1 pb-0.5 pt-3">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex w-full items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <ChevronRight size={16} className={`text-faint transition-transform ${showHistory ? 'rotate-90' : ''}`} />
            <span className="text-[13px] font-semibold text-[#8A8D88]">Completed</span>
          </span>
          {showHistory && <HistoryCount />}
        </button>
        {showHistory && <HistoryList onRestore={restore} />}
      </div>

      {notice && <Snackbar message={notice} />}

      {deleted && (
        <div className="fixed bottom-25 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-lg bg-ink px-4 py-2.5 text-surface shadow-lg">
          <span className="text-sm">Task deleted</span>
          <button
            onClick={() => { void undoDeleteTodo(deleted); setDeleted(null); }}
            className="text-sm font-semibold text-accent"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

function HistoryCount() {
  const completed = useCompletedTodos();
  if (!completed) return null;
  return <span className="font-mono text-[12px] text-faint">{completed.length}</span>;
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
    <div className="flex flex-col gap-2">
      <div className="mb-0.5 flex items-center gap-2 rounded-15 border border-white/10 bg-surface py-3.5 pl-3.75 pr-2">
        <input
          value={note}
          maxLength={MAX_NOTE_LENGTH}
          placeholder="Add a task…"
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void submit()}
          className="min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-muted"
        />
        <button
          onClick={() => void submit()}
          disabled={!note.trim()}
          className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-9 bg-accent text-ink-on-accent disabled:opacity-40"
        >
          <Plus size={17} strokeWidth={2.6} />
        </button>
      </div>
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: note.trim() ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <CategoryChips selectedId={categoryId} onSelect={setCategoryId} variant="grid" />
        </div>
      </div>
      {error && <p className="text-[13px] text-danger">{error}</p>}
    </div>
  );
}

function TodoRow({ todo, categories, onDeleted }: { todo: OpenTodo; categories: Category[], onDeleted: (d: DeletedTodo) => void }) {
  const category = categories.find((c) => c.id === todo.categoryId);
  const x = useMotionValue(0);
  // Red delete backdrop fades in as you drag left
  const bgOpacity = useTransform(x, [-80, 0], [1, 0]);

  const handleDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    const swipedFar = info.offset.x < -100;
    const flicked = info.velocity.x < -500;
    if (swipedFar || flicked) {
      animate(x, -400, { duration: 0.2 });
      setTimeout(async () => {
        const result = await deleteTodo(todo.id);
        onDeleted(result);
      }, 180);
    } else {
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 40 });
    }
  };

  return (
    <li className="relative overflow-hidden border-b border-white/6">
      {/* Delete backdrop revealed on left-swipe */}
      <motion.div
        style={{ opacity: bgOpacity }}
        className="absolute inset-0 flex items-center justify-end bg-red-500/90 pr-5"
      >
        <Trash2 size={18} className="text-white" />
      </motion.div>

      <motion.div
        drag="x"
        style={{ x }}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.7, right: 0 }}   // only rubber-band leftward
        onDragEnd={handleDragEnd}
        className="relative flex items-center gap-3.25 py-3.25 px-2.25 bg-canvas"
      >
        <button
          onClick={() => void completeTodo(todo.id)}
          className="h-5.75 w-5.75 shrink-0 rounded-7 border-2 border-control"
          aria-label="Complete task"
        />
        <div
          className="min-w-0 flex-1 cursor-pointer"
          onClick={() => useNav.getState().editTodo(todo.id)}
        >
          <div className="truncate text-[15px] font-medium text-ink">{todo.note}</div>
          {(todo.priority !== Priority.None || todo.remindAt) && (
            <div className="mt-1 flex items-center gap-2">
              {todo.priority !== Priority.None && (
                <span
                  className="flex items-center gap-1.5 rounded-7 px-2 py-0.5 text-[10.5px] font-bold"
                  style={{ background: tint(PRIORITY_COLORS[todo.priority], 0.16), color: PRIORITY_COLORS[todo.priority] }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: PRIORITY_COLORS[todo.priority] }} />
                  {PRIORITY_LABELS[todo.priority]}
                </span>
              )}
              {todo.remindAt && (
                <span className="flex items-center gap-1 font-mono text-[11.5px] text-muted">
                  <Bell size={12} />
                  {timeFmt.format(new Date(todo.remindAt))}
                </span>
              )}
            </div>
          )}
        </div>
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: category?.color ?? DEFAULT_CATEGORY_COLOR }}
        />
      </motion.div>
    </li>
  );
}

function HistoryList({ onRestore }: { onRestore: (todo: Todo) => void }) {
  const completed = useCompletedTodos();
  if (!completed) return null;
  return (
    <ul className="flex flex-col opacity-60">
      {completed.map((t) => (
        <li key={t.id} className="flex items-center gap-2.5 py-1.5">
          <span className="flex-1 truncate text-[14px] text-ink line-through">{t.note}</span>
          <button onClick={() => onRestore(t)} className="text-[13px] font-semibold text-accent">
            Restore
          </button>
        </li>
      ))}
    </ul>
  );
}
