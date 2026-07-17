import { v7 as uuidv7 } from 'uuid';
import { db } from './db';
import type { Category, Todo, Reminder, TimeEntry, UserSettings, Syncable } from './types';
import type { SyncTable } from '../sync/outbox';
import type Dexie from 'dexie';

interface RowTypes {
  categories: Category;
  todos: Todo;
  reminders: Reminder;
  timeEntries: TimeEntry;
  settings: UserSettings;
}

type RowFor<T extends SyncTable> = RowTypes[T];

const nowIso = () => new Date().toISOString();

async function enqueue(table: SyncTable, entityId: string): Promise<void> {
  const existing = await db.outbox.get(entityId);
  // Coalesce: one outbox slot per entity. A second edit before sync just
  // refreshes the row — push sends latest state anyway (LWW full-row).
  await db.outbox.put({
    entityId,
    table,
    queuedAt: nowIso(),
    attempts: existing?.attempts ?? 0,
  });
}

/** Create a row: generates id + stamps timestamps + enqueues, atomically. */
export async function create<T extends SyncTable>(
  table: T,
  data: Omit<RowFor<T>, keyof Syncable>,
  id?: string,               // ← new: pre-generated UUIDv7 if the caller needs the ID early
): Promise<RowFor<T>> {
  const now = nowIso();
  const row = {
    ...data,
    id: id ?? uuidv7(),
    createdAt: now,
    modifiedAt: now,
    isDeleted: false,
  } as RowFor<T>;

  await db.transaction('rw', db[table], db.outbox, async () => {
    await (db[table] as Dexie.Table).put(row);
    await enqueue(table, row.id);
  });
  return row;
}

/** Update fields on a row: bumps modifiedAt + enqueues, atomically. */
export async function update<T extends SyncTable>(
  table: T,
  id: string,
  changes: Partial<Omit<RowFor<T>, keyof Syncable>>,
): Promise<void> {
  await db.transaction('rw', db[table], db.outbox, async () => {
    const count = await (db[table] as Dexie.Table).update(id, {
      ...changes,
      modifiedAt: nowIso(),
    });
    if (count === 0) throw new Error(`update: no row ${id} in ${table}`);
    await enqueue(table, id);
  });
}

/** Soft-delete: flips isDeleted + enqueues. Rows are never physically removed. */
export async function remove(table: SyncTable, id: string): Promise<void> {
  await db.transaction('rw', db[table], db.outbox, async () => {
    const count = await (db[table] as Dexie.Table).update(id, {
      isDeleted: true,
      modifiedAt: nowIso(),
    });
    if (count === 0) throw new Error(`remove: no row ${id} in ${table}`);
    await enqueue(table, id);
  });
}

/** Un-delete a soft-deleted row (the inverse of remove). Bumps modifiedAt + enqueues. */
export async function restore(table: SyncTable, id: string): Promise<void> {
  await db.transaction('rw', db[table], db.outbox, async () => {
    const count = await (db[table] as Dexie.Table).update(id, {
      isDeleted: false,
      modifiedAt: nowIso(),
    });
    if (count === 0) throw new Error(`restore: no row ${id} in ${table}`);
    await enqueue(table, id);
  });
}