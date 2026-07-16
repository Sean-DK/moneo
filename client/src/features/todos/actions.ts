import { create, update } from '../../lib/db/repo';
import { requestSync } from '../../lib/sync/scheduler';
import { CompletionSource, Priority, type Todo } from '../../lib/db/types';
import { cancelReminderForCompletedTodo } from '../reminders/actions';

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