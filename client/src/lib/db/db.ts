import Dexie, { type EntityTable } from 'dexie';
import type { Category, Todo, Reminder, TimeEntry, UserSettings, MoodEntry } from './types';
import type { OutboxEntry } from '../sync/outbox';

export interface NagLogEntry {
  id: string;
  firedAt: string; // ISO
}

export const db = new Dexie('moneo') as Dexie & {
  categories: EntityTable<Category, 'id'>;
  todos: EntityTable<Todo, 'id'>;
  reminders: EntityTable<Reminder, 'id'>;
  timeEntries: EntityTable<TimeEntry, 'id'>;
  settings: EntityTable<UserSettings, 'id'>;
  outbox: EntityTable<OutboxEntry, 'entityId'>;
  meta: EntityTable<{ key: string; value: string }, 'key'>;
  nagLog: EntityTable<NagLogEntry, 'id'>;
  moodEntries: EntityTable<MoodEntry, 'id'>;
};

db.version(1).stores({
  // Dexie schema strings list only PK + indexed fields, not all columns
  categories: 'id, sortOrder',
  todos: 'id, isCompleted, categoryId',
  reminders: 'id, status, remindAt, todoId',
  timeEntries: 'id, startedAt, endedAt',
  settings: 'id',
  outbox: 'entityId, queuedAt',
  meta: 'key',   // syncCursor lives here
});

db.version(2).stores({
  categories: 'id, sortOrder',
  todos: 'id, isCompleted, categoryId',
  reminders: 'id, status, remindAt, todoId',
  timeEntries: 'id, startedAt, endedAt',
  settings: 'id',
  outbox: 'entityId, queuedAt',
  meta: 'key',
  nagLog: 'id, firedAt', // local-only, never synced
});

db.version(3).stores({
  categories: 'id, sortOrder',
  todos: 'id, isCompleted, categoryId',
  reminders: 'id, status, remindAt, todoId',
  timeEntries: 'id, startedAt, endedAt',
  settings: 'id',
  moodEntries: 'id, moodDate',   // indexed on moodDate for per-day lookup
  outbox: 'entityId, queuedAt',
  meta: 'key',
  nagLog: 'id, firedAt',
});