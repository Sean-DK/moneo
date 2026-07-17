import { create, remove, restore, update } from '../../lib/db/repo';
import { requestSync } from '../../lib/sync/scheduler';
import { CompletionSource, Priority, ReminderStatus, type Todo } from '../../lib/db/types';
import { cancelReminderForCompletedTodo } from '../reminders/actions';
import { db } from '../../lib/db/db';
import { cancelReminderNotification, scheduleReminderNotification } from '../../lib/notifications/reminderNotifications';

export const MAX_NOTE_LENGTH = 50;

export async function createTodo(input: {
  note: string;
  priority: Priority;
  categoryId: string;
}): Promise<Todo> {
  const note = input.note.trim();
  if (!note) throw new Error('Note is required');
  if (note.length > MAX_NOTE_LENGTH) throw new Error(`Max ${MAX_NOTE_LENGTH} characters`);

  const todo = await create('todos', {
    note,
    priority: input.priority,
    categoryId: input.categoryId,
    isCompleted: false,
    completedAt: null,
    sourceReminderId: null,   // independent todo; reminder-born ones set this in createReminder
    completionSource: null,
  });
  requestSync();
  return todo;
}

export async function completeTodo(id: string): Promise<void> {
  await update('todos', id, {
    isCompleted: true,
    completedAt: new Date().toISOString(),
    completionSource: CompletionSource.InApp,
  });
  await cancelReminderForCompletedTodo(id);   // the rule from Bite 3, finally called
  requestSync();
}

/** Undo a completion (from history or an undo snackbar). */
export async function uncompleteTodo(id: string): Promise<void> {
  await update('todos', id, {
    isCompleted: false,
    completedAt: null,
    completionSource: null,
  });
  requestSync();
}

export interface DeletedTodo {
  todoId: string;
  /** Reminders we cancelled as part of the delete, with their prior status, so undo can restore them. */
  cancelledReminders: { id: string; priorStatus: ReminderStatus; remindAt: string }[];
}

export async function deleteTodo(id: string): Promise<DeletedTodo> {
  // Capture linked pending reminders BEFORE cancelling, so undo can restore them.
  const linked = await db.reminders
    .filter((r) => r.todoId === id && !r.isDeleted && r.status === ReminderStatus.Pending)
    .toArray();

  const cancelledReminders = linked.map((r) => ({
    id: r.id,
    priorStatus: r.status,      // always Pending here, but captured for symmetry/future-proofing
    remindAt: r.remindAt,
  }));

  await remove('todos', id);

  for (const r of linked) {
    await update('reminders', r.id, {
      status: ReminderStatus.Cancelled,
      completedAt: new Date().toISOString(),
      completionSource: CompletionSource.LinkedTodoDeleted,  // ← the new enum value (added next step)
    });
    await cancelReminderNotification(r.id);
  }

  requestSync();
  return { todoId: id, cancelledReminders };
}

/** Reverse a swipe-delete: un-delete the todo and revive its cancelled reminders. */
export async function undoDeleteTodo(deleted: DeletedTodo): Promise<void> {
  await restore('todos', deleted.todoId);

  for (const r of deleted.cancelledReminders) {
    await update('reminders', r.id, {
      status: r.priorStatus,
      completedAt: null,
      completionSource: null,
    });
    if (new Date(r.remindAt).getTime() > Date.now()) {
      const reminder = await db.reminders.get(r.id);
      if (reminder) await scheduleReminderNotification(reminder);
    }
  }
  requestSync();
}

/** The pending reminder linked to a todo, if any (the one-per-todo invariant). */
export async function getLinkedReminder(todoId: string) {
  return db.reminders
    .filter((r) => r.todoId === todoId && !r.isDeleted && r.status === ReminderStatus.Pending)
    .first();
}

/** Attach a new reminder to an EXISTING todo (does NOT set sourceReminderId — the todo predates it). */
export async function createReminderForTodo(
  todo: { id: string; note: string; priority: Priority; categoryId: string },
  remindAt: Date,
  presetUsed: string,
): Promise<void> {
  // Defensive: enforce one-pending-reminder-per-todo (client owns this invariant).
  const existing = await getLinkedReminder(todo.id);
  if (existing) return;

  const reminder = await create('reminders', {
    note: todo.note,
    priority: todo.priority,
    categoryId: todo.categoryId,
    remindAt: remindAt.toISOString(),
    status: ReminderStatus.Pending,
    todoId: todo.id,
    firedAt: null,
    completedAt: null,
    completionSource: null,
    presetUsed,
    snoozeCount: 0,
    originalRemindAt: remindAt.toISOString(),
  });
  await scheduleReminderNotification(reminder);
  requestSync();
}

/** Cancel a todo's reminder while KEEPING the todo (the yellow button). */
export async function cancelReminderKeepTodo(reminderId: string): Promise<void> {
  await update('reminders', reminderId, {
    status: ReminderStatus.Cancelled,
    completedAt: new Date().toISOString(),
    completionSource: CompletionSource.UserCancelledReminder,
  });
  await cancelReminderNotification(reminderId);
  requestSync();
}

/** Edit the todo's own fields (note/priority/category), propagating to a linked pending reminder. */
export async function editTodo(
  id: string,
  changes: { note?: string; priority?: Priority; categoryId?: string },
): Promise<void> {
  const patch: Partial<Todo> = {};
  if (changes.note !== undefined) {
    const n = changes.note.trim();
    if (!n) throw new Error('Note is required');
    if (n.length > MAX_NOTE_LENGTH) throw new Error(`Max ${MAX_NOTE_LENGTH} characters`);
    patch.note = n;
  }
  if (changes.priority !== undefined) patch.priority = changes.priority;
  if (changes.categoryId !== undefined) patch.categoryId = changes.categoryId;

  await update('todos', id, patch);

  // Keep a linked pending reminder's denormalized fields in sync with the todo.
  const linked = await getLinkedReminder(id);
  if (linked) {
    await update('reminders', linked.id, patch);
  }
  requestSync();
}