import type { UserSettings } from '../../lib/db/types';

/** Minutes-from-midnight of a Date, in local time. */
function localMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Is `now` within quiet hours? Quiet hours run from beforeBedTime to
 * firstThingTime, wrapping past midnight (e.g. 22:00 → 05:00).
 */
export function inQuietHours(settings: UserSettings, now: Date): boolean {
  const m = localMinutes(now);
  const start = settings.beforeBedTime; // e.g. 1320 (22:00)
  const end = settings.firstThingTime;  // e.g. 300  (05:00)

  if (start === end) return false;      // degenerate: no quiet window
  if (start < end) {
    // Non-wrapping window (unusual, but handle it): [start, end)
    return m >= start && m < end;
  }
  // Wrapping window: quiet if after bedtime OR before first-thing
  return m >= start || m < end;
}

/**
 * The instant the current "nag day" began — i.e. the most recent
 * firstThingTime boundary at or before `now`. Idle-nag daily caps count
 * fires since this boundary, so the cap resets each morning at wake time
 * rather than at midnight.
 */
export function nagDayStart(settings: UserSettings, now: Date): Date {
  const start = new Date(now);
  start.setHours(Math.floor(settings.firstThingTime / 60), settings.firstThingTime % 60, 0, 0);
  if (start.getTime() > now.getTime()) {
    // firstThingTime hasn't happened yet today → day began yesterday morning
    start.setDate(start.getDate() - 1);
  }
  return start;
}