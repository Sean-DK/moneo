import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db/db';
import { ReminderStatus, type Todo } from '../../lib/db/types';

/** A todo plus the time of its pending linked reminder, if any. */
export interface OpenTodo extends Todo {
  remindAt: string | null;
}

export function useOpenTodos(): OpenTodo[] | undefined {
  return useLiveQuery(async () => {
    const todos = await db.todos
      .filter((t) => !t.isDeleted && !t.isCompleted)
      .toArray();

    // Map each todo to its pending reminder's time (todos born from reminders
    // always have one; hand-made todos don't).
    const pending = await db.reminders
      .filter((r) => !r.isDeleted && r.status === ReminderStatus.Pending && r.todoId !== null)
      .toArray();
    const byTodo = new Map(pending.map((r) => [r.todoId, r.remindAt]));

    return todos
      .map((t) => ({ ...t, remindAt: byTodo.get(t.id) ?? null }))
      .sort((a, b) => b.priority - a.priority || a.createdAt.localeCompare(b.createdAt));
  });
}

export function useCompletedTodos(limit = 50): Todo[] | undefined {
  return useLiveQuery(async () => {
    const rows = await db.todos
      .filter((t) => !t.isDeleted && t.isCompleted)
      .toArray();
    return rows
      .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
      .slice(0, limit);
  });
}