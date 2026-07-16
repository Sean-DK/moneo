import { db } from '../db/db';
import { api, ApiError } from '../api/http';
import type { SyncTable, OutboxEntry } from './outbox';
import type { PushRequest, PushResponse, PullResponse } from './contracts';

const CURSOR_KEY = 'syncCursor';
const MAX_ATTEMPTS = 8;      // then the entry is a poison pill and gets dropped
const BATCH_LIMIT = 500;     // server-enforced; we chunk to stay under it

// FK dependency order: referenced tables before referencing tables
const TABLE_ORDER: SyncTable[] = ['categories', 'settings', 'todos', 'timeEntries', 'reminders'];

export type SyncResult =
  | { ok: true; pushed: number; pulled: number }
  | { ok: false; error: string };

let inFlight: Promise<SyncResult> | null = null;

/** Run a full sync cycle (push then pull). Concurrent calls share one cycle. */
export function sync(): Promise<SyncResult> {
  inFlight ??= run().finally(() => (inFlight = null));
  return inFlight;
}

async function run(): Promise<SyncResult> {
  try {
    const pushed = await push();
    const pulled = await pull();
    return { ok: true, pushed, pulled };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// --- Push ---

async function push(): Promise<number> {
  let totalApplied = 0;

  // Loop: each iteration snapshots up to BATCH_LIMIT outbox entries, sends,
  // settles. Repeats until the outbox is (momentarily) empty.
  for (;;) {
    const entries = await db.outbox.orderBy('queuedAt').limit(BATCH_LIMIT).toArray();
    if (entries.length === 0) return totalApplied;

    const request: PushRequest = {};
    for (const table of TABLE_ORDER) {
      const ids = entries.filter((e) => e.table === table).map((e) => e.entityId);
      if (ids.length === 0) continue;
      const rows = await db[table].where('id').anyOf(ids).toArray();
      if (rows.length > 0) request[table] = rows as never;
    }

    let response: PushResponse;
    try {
      response = await api<PushResponse>('/sync/push', {
        method: 'POST',
        body: JSON.stringify(request),
      });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        // Dangling FK — whole batch rolled back server-side. Client bug by
        // definition (we push in dependency order). Count attempts so a
        // genuinely poisoned batch eventually drains instead of wedging sync.
        await bumpAttempts(entries);
        throw new Error(`push: batch integrity failure (409): ${e.message}`);
      }
      throw e; // network/5xx: leave outbox untouched; next sync retries
    }

    await settle(entries, response);
    totalApplied += entries.length;
  }
}

/** Clear or retain outbox entries based on per-item results + the in-flight-edit race guard. */
async function settle(sent: OutboxEntry[], response: PushResponse): Promise<void> {
  await db.transaction('rw', db.outbox, async () => {
    for (const entry of sent) {
      const result = response.results[entry.entityId];
      const current = await db.outbox.get(entry.entityId);
      if (!current) continue;

      // THE RACE GUARD: if the user edited this entity while the push was in
      // flight, repo.enqueue() refreshed queuedAt. The outbox entry no longer
      // represents what we sent — leave it for the next cycle.
      if (current.queuedAt !== entry.queuedAt) continue;

      if (!result) {
        // Server didn't mention it (shouldn't happen) — retry, but count it
        await db.outbox.put({ ...current, attempts: current.attempts + 1 });
        if (current.attempts + 1 >= MAX_ATTEMPTS) await db.outbox.delete(entry.entityId);
        continue;
      }

      switch (result.status) {
        case 'applied':
        case 'skippedStale': // our write lost LWW; pull will bring the winner
          await db.outbox.delete(entry.entityId);
          break;
        case 'rejected':
          // Poison pill policy (agreed): drop, don't retry forever
          console.warn(`sync: dropped rejected ${entry.table}/${entry.entityId}: ${result.reason}`);
          await db.outbox.delete(entry.entityId);
          break;
      }
    }
  });
}

async function bumpAttempts(entries: OutboxEntry[]): Promise<void> {
  await db.transaction('rw', db.outbox, async () => {
    for (const entry of entries) {
      const current = await db.outbox.get(entry.entityId);
      if (!current || current.queuedAt !== entry.queuedAt) continue;
      if (current.attempts + 1 >= MAX_ATTEMPTS) {
        console.warn(`sync: dropped poison ${entry.table}/${entry.entityId} after ${MAX_ATTEMPTS} attempts`);
        await db.outbox.delete(entry.entityId);
      } else {
        await db.outbox.put({ ...current, attempts: current.attempts + 1 });
      }
    }
  });
}

// --- Pull ---

async function pull(): Promise<number> {
  const cursorRow = await db.meta.get(CURSOR_KEY);
  const since = cursorRow?.value ?? '0';

  const response = await api<PullResponse>(`/sync/pull?since=${since}`);

  const count =
    response.categories.length + response.todos.length + response.reminders.length +
    response.timeEntries.length + response.settings.length;

  await db.transaction(
    'rw',
    [db.categories, db.todos, db.reminders, db.timeEntries, db.settings, db.outbox, db.meta],
    async () => {
      for (const table of TABLE_ORDER) {
        for (const row of response[table]) {
          // Don't clobber local rows with un-pushed edits — local wins here;
          // its outbox entry will push it, and LWW on the server arbitrates.
          const pending = await db.outbox.get(row.id);
          if (pending) continue;
          await db[table].put(row as never);
        }
      }
      await db.meta.put({ key: CURSOR_KEY, value: response.cursor });
    },
  );

  return count;
}