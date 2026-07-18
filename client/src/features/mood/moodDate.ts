import { nagDayStart } from '../tracking/nagWindow';
import type { UserSettings } from '../../lib/db/types';

/** The moodDate ("YYYY-MM-DD") a check-in at `now` belongs to — the current
 *  nag-day (resets at firstThingTime, so a 1 AM check-in is still "yesterday"). */
export function currentMoodDate(settings: UserSettings, now: Date): string {
  return toDateString(nagDayStart(settings, now));
}

/** Local-date string "YYYY-MM-DD" (not UTC — the logical day is calendar-local). */
export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse a moodDate string back to a local Date (midnight). For display/backfill. */
export function fromDateString(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}