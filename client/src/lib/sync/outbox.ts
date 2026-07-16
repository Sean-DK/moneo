export type SyncTable = 'categories' | 'todos' | 'reminders' | 'timeEntries' | 'settings';

export interface OutboxEntry {
  entityId: string;     // primary key — one outbox slot per entity (coalescing, see below)
  table: SyncTable;
  queuedAt: string;
  attempts: number;
}