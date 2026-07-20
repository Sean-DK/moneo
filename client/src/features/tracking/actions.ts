import { db } from '../../lib/db/db';
import { create, remove, update } from '../../lib/db/repo';
import { requestSync } from '../../lib/sync/scheduler';
import { TimeEntrySource, TimerStopSource, type TimeEntry } from '../../lib/db/types';
import { resolveBackdateCascade, type CascadePlan } from './backdateCascade';
import { reconcileNags } from './nagScheduler';

export const MAX_NAME_LENGTH = 50;

const nowIso = () => new Date().toISOString();

/** The currently running entry (endedAt === null), or undefined. */
export async function getRunningEntry(): Promise<TimeEntry | undefined> {
  return db.timeEntries.filter((e) => !e.isDeleted && e.endedAt === null).first();
}

/**
 * Start a new timer. If one is already running, stop it first
 * (stoppedBy = AutoNextTimer) — enforces the one-active-timer rule.
 */
export async function startTimer(input: { name: string; categoryId: string }): Promise<TimeEntry> {
  const name = input.name.trim();
  if (!name) throw new Error('Activity name is required');
  if (name.length > MAX_NAME_LENGTH) throw new Error(`Max ${MAX_NAME_LENGTH} characters`);

  const running = await getRunningEntry();
  if (running) {
    await update('timeEntries', running.id, {
      endedAt: nowIso(),
      stoppedBy: TimerStopSource.AutoNextTimer,
    });
  }

  const entry = await create('timeEntries', {
    name,
    categoryId: input.categoryId,
    startedAt: nowIso(),
    endedAt: null,
    source: TimeEntrySource.Timer,
    editCount: 0,
    stoppedBy: null,
  });
  requestSync();
  return entry;
}

/** Stop the running timer (user-initiated). */
export async function stopTimer(): Promise<void> {
  const running = await getRunningEntry();
  if (!running) return;
  await update('timeEntries', running.id, {
    endedAt: nowIso(),
    stoppedBy: TimerStopSource.User,
  });
  requestSync();
}

/** Backfill a completed entry after the fact (source = Manual). */
export async function addManualEntry(input: {
  name: string; categoryId: string; startedAt: Date; endedAt: Date;
}): Promise<TimeEntry> {
  const name = input.name.trim();
  if (!name) throw new Error('Activity name is required');
  if (input.endedAt <= input.startedAt) throw new Error('End must be after start');

  const entry = await create('timeEntries', {
    name,
    categoryId: input.categoryId,
    startedAt: input.startedAt.toISOString(),
    endedAt: input.endedAt.toISOString(),
    source: TimeEntrySource.Manual,
    editCount: 0,
    stoppedBy: TimerStopSource.User,
  });
  requestSync();
  return entry;
}

/** Edit an existing entry's times/name; bumps editCount for data-quality tracking. */
export async function editEntry(id: string, changes: {
  name?: string; startedAt?: Date; endedAt?: Date; categoryId?: string;
}): Promise<void> {
  const entry = await db.timeEntries.get(id);
  if (!entry || entry.isDeleted) return;

  const patch: Partial<TimeEntry> = { editCount: entry.editCount + 1 };
  if (changes.name !== undefined) patch.name = changes.name.trim();
  if (changes.categoryId !== undefined) patch.categoryId = changes.categoryId;
  if (changes.startedAt !== undefined) patch.startedAt = changes.startedAt.toISOString();
  if (changes.endedAt !== undefined) patch.endedAt = changes.endedAt.toISOString();

  if (patch.startedAt && patch.endedAt && patch.endedAt <= patch.startedAt) {
    throw new Error('End must be after start');
  }
  await update('timeEntries', id, patch);
  requestSync();
}

/**
 * Compute the cascade for a proposed backdated start WITHOUT applying it —
 * so the UI can show a confirm dialog when destructive.
 */
export async function planBackdatedStart(startedAt: Date): Promise<CascadePlan> {
  const entries = await db.timeEntries.filter((e) => !e.isDeleted).toArray();
  return resolveBackdateCascade(entries, startedAt, new Date());
}

/**
 * Start a timer with a (possibly backdated) start time, applying the cascade.
 * Caller must have already confirmed if plan.destructive.
 */
export async function startTimerAt(
  input: { name: string; categoryId: string },
  startedAt: Date,
  plan: CascadePlan,
): Promise<TimeEntry> {
  const name = input.name.trim();
  if (!name) throw new Error('Activity name is required');
  if (name.length > MAX_NAME_LENGTH) throw new Error(`Max ${MAX_NAME_LENGTH} characters`);

  // Apply cascade to prior entries first (system action — no editCount bump).
  if (plan.toShorten) {
    await update('timeEntries', plan.toShorten.entry.id, { endedAt: plan.toShorten.newEndedAt });
  }
  for (const e of plan.toDelete) {
    await remove('timeEntries', e.id);
  }

  // Any still-running timer that WASN'T swallowed stops at the new start.
  const running = await getRunningEntry();
  if (running && !plan.toDelete.some((d) => d.id === running.id) && plan.toShorten?.entry.id !== running.id) {
    await update('timeEntries', running.id, {
      endedAt: startedAt.toISOString(),
      stoppedBy: TimerStopSource.AutoNextTimer,
    });
  }

  const entry = await create('timeEntries', {
    name,
    categoryId: input.categoryId,
    startedAt: startedAt.toISOString(),
    endedAt: null,
    source: TimeEntrySource.Timer,
    editCount: 0,
    stoppedBy: null,
  });
  requestSync();
  void reconcileNags();
  return entry;
}

export async function deleteEntry(id: string): Promise<void> {
  await remove('timeEntries', id);
  requestSync();
  void reconcileNags();   // in case it was the running entry
}