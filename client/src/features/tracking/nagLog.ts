import { v7 as uuidv7 } from 'uuid';
import { db } from '../../lib/db/db';
import { nagDayStart } from './nagWindow';
import type { UserSettings } from '../../lib/db/types';

/** Record that a nag fired now (called by the notification-received listener). */
export async function logNagFired(): Promise<void> {
  await db.nagLog.put({ id: uuidv7(), firedAt: new Date().toISOString() });
}

/** How many nags have fired since this nag-day began. */
export async function nagsFiredToday(settings: UserSettings, now: Date): Promise<number> {
  const since = nagDayStart(settings, now).toISOString();
  return db.nagLog.where('firedAt').aboveOrEqual(since).count();
}

/** Housekeeping: drop nag-log rows older than ~2 days (unbounded growth guard). */
export async function pruneNagLog(now: Date): Promise<void> {
  const cutoff = new Date(now.getTime() - 2 * 86_400_000).toISOString();
  await db.nagLog.where('firedAt').below(cutoff).delete();
}