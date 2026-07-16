import { useEffect, useState } from 'react';
import { v7 as uuidv7 } from 'uuid';
import { db } from '../../lib/db/db';
import { create, remove, update } from '../../lib/db/repo';
import { requestSync } from '../../lib/sync/scheduler';
import {
  cancelReminderNotification,
  scheduleReminderNotification,
} from '../../lib/notifications/reminderNotifications';
import { CompletionSource, Priority, ReminderStatus, type Reminder } from '../../lib/db/types';

export const MAX_NOTE_LENGTH = 50;

const nowIso = () => new Date().toISOString();

export interface CreateReminderInput {
  note: string;
  priority: Priority;
  categoryId: string;
  remindAt: Date;
  presetUsed: string;
}

export interface CreatedReminder {
  reminder: Reminder;
  todoId: string; // always created now
}

export async function createReminder(input: CreateReminderInput): Promise<CreatedReminder> {
  const note = input.note.trim();
  if (!note) throw new Error('Note is required');
  if (note.length > MAX_NOTE_LENGTH) throw new Error(`Max ${MAX_NOTE_LENGTH} characters`);

  const reminderId = uuidv7();

  const todo = await create('todos', {
    note,
    priority: input.priority,
    categoryId: input.categoryId,
    isCompleted: false,
    completedAt: null,
    sourceReminderId: reminderId, // provenance points at the about-to-exist reminder
    completionSource: null,
  });

  const reminder = await create(
    'reminders',
    {
      note,
      priority: input.priority,
      categoryId: input.categoryId,
      remindAt: input.remindAt.toISOString(),
      status: ReminderStatus.Pending,
      todoId: todo.id,
      firedAt: null,
      completedAt: null,
      completionSource: null,
      presetUsed: input.presetUsed,
      snoozeCount: 0,
      originalRemindAt: input.remindAt.toISOString(),
    },
    reminderId,
  );

  await scheduleReminderNotification(reminder);
  requestSync();
  return { reminder, todoId: todo.id };
}

/** Undo a just-created reminder and its linked todo. */
export async function undoCreate(created: CreatedReminder): Promise<void> {
  await remove('reminders', created.reminder.id);
  await remove('todos', created.todoId);
  await cancelReminderNotification(created.reminder.id);
  requestSync();
}

/** Mark a reminder done (from app UI or notification action). Completes the linked todo. */
export async function completeReminder(id: string, source: CompletionSource): Promise<void> {
  const reminder = await db.reminders.get(id);
  if (!reminder || reminder.isDeleted) return;

  await update('reminders', id, {
    status: ReminderStatus.Completed,
    completedAt: nowIso(),
    completionSource: source,
  });

  if (reminder.todoId) {
    const todo = await db.todos.get(reminder.todoId);
    if (todo && !todo.isDeleted && !todo.isCompleted) {
      await update('todos', todo.id, {
        isCompleted: true,
        completedAt: nowIso(),
        completionSource: source,
      });
    }
  }

  await cancelReminderNotification(id);
  requestSync();
}

export async function snoozeReminder(id: string, minutes = 15): Promise<void> {
  const reminder = await db.reminders.get(id);
  if (!reminder || reminder.isDeleted) return;

  const newAt = new Date(Date.now() + minutes * 60_000);
  await update('reminders', id, {
    remindAt: newAt.toISOString(),
    status: ReminderStatus.Pending,
    snoozeCount: reminder.snoozeCount + 1,
  });
  await scheduleReminderNotification({ ...reminder, remindAt: newAt.toISOString() });
  requestSync();
}

/** When the notification fires (delivery event), record it — analytics only. */
export async function markReminderFired(id: string): Promise<void> {
  const r = await db.reminders.get(id);
  if (!r || r.isDeleted || r.status !== ReminderStatus.Pending) return;
  await update('reminders', id, { status: ReminderStatus.Fired, firedAt: nowIso() });
  requestSync();
}

/** Called when a linked todo is completed: cancel the pending reminder. */
export async function cancelReminderForCompletedTodo(todoId: string): Promise<void> {
  const linked = await db.reminders
    .where('todoId').equals(todoId)
    .filter((r) => !r.isDeleted && r.status === ReminderStatus.Pending)
    .toArray();

  for (const r of linked) {
    await update('reminders', r.id, {
      status: ReminderStatus.Cancelled,
      completedAt: nowIso(),
      completionSource: CompletionSource.LinkedTodo,
    });
    await cancelReminderNotification(r.id);
  }
  if (linked.length > 0) requestSync();
}

export function useNow(intervalMs = 30_000): Date {
  // Re-render periodically so past slots grey out while the screen sits open
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}