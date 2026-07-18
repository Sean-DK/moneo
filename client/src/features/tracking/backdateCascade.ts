import type { TimeEntry } from '../../lib/db/types';

export interface CascadePlan {
  /** Entries fully swallowed by the backdate → delete. */
  toDelete: TimeEntry[];
  /** The single entry the new start lands inside → shorten its end to newStart. */
  toShorten: { entry: TimeEntry; newEndedAt: string } | null;
  /** True if toDelete is non-empty (drives the confirm dialog). */
  destructive: boolean;
}

/**
 * Given all existing entries and a proposed backdated start for a NEW entry,
 * compute what must change to keep the timeline non-overlapping.
 *
 * Rules:
 *  - An existing entry entirely at/after newStart is swallowed → delete.
 *  - The entry that CONTAINS newStart is shortened to end at newStart...
 *  - ...unless shortening collapses it to <= 0 length, in which case it's deleted too.
 *  - Entries entirely before newStart are untouched.
 *  - Gaps (no entry spanning newStart) mean nothing to shorten.
 *
 * `now` is passed so a currently-running entry (endedAt === null) is treated
 * as ending at `now` for overlap purposes.
 */
export function resolveBackdateCascade(
  entries: TimeEntry[],
  newStart: Date,
  now: Date,
): CascadePlan {
  const startMs = newStart.getTime();
  const nowMs = now.getTime();

  const toDelete: TimeEntry[] = [];
  let toShorten: { entry: TimeEntry; newEndedAt: string } | null = null;

  for (const e of entries) {
    if (e.isDeleted) continue;
    const eStart = new Date(e.startedAt).getTime();
    const eEnd = e.endedAt === null ? nowMs : new Date(e.endedAt).getTime();

    // Entirely before the new start → untouched.
    if (eEnd <= startMs) continue;

    // Entirely at/after the new start → swallowed.
    if (eStart >= startMs) {
      toDelete.push(e);
      continue;
    }

    // Straddles the new start (eStart < startMs < eEnd) → shorten to newStart,
    // unless that collapses it (can't, since eStart < startMs strictly, but
    // guard for equality/rounding).
    if (startMs <= eStart) {
      toDelete.push(e);
    } else {
      toShorten = { entry: e, newEndedAt: newStart.toISOString() };
    }
  }

  return { toDelete, toShorten, destructive: toDelete.length > 0 };
}

/** Human-readable duration for the warning dialog, e.g. "20 minutes". */
export function formatEntryDuration(entry: TimeEntry, now: Date): string {
  const start = new Date(entry.startedAt).getTime();
  const end = entry.endedAt === null ? now.getTime() : new Date(entry.endedAt).getTime();
  const min = Math.max(1, Math.round((end - start) / 60_000));
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'}`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} hour${h === 1 ? '' : 's'}` : `${h}h ${m}m`;
}