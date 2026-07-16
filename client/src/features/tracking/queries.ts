import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db/db';
import type { TimeEntry } from '../../lib/db/types';

/** The running entry, or null. Re-fires when timeEntries changes. */
export function useRunningEntry(): TimeEntry | null | undefined {
  return useLiveQuery(async () => {
    const running = await db.timeEntries.filter((e) => !e.isDeleted && e.endedAt === null).first();
    return running ?? null;
  });
}

/** Completed entries, most recent first. */
export function useRecentEntries(limit = 50): TimeEntry[] | undefined {
  return useLiveQuery(async () => {
    const rows = await db.timeEntries
      .filter((e) => !e.isDeleted && e.endedAt !== null)
      .toArray();
    return rows
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, limit);
  });
}

/** A 1-second ticking clock for the live timer display. */
import { useEffect, useState } from 'react';
export function useTick(active: boolean): number {
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return tick;
}