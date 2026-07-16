import type { UserSettings } from '../../lib/db/types';

/**
 * Quiet hours run from beforeBedTime to firstThingTime (wrapping midnight).
 * Both are minutes-from-midnight local time. Returns true if the given instant
 * falls inside the quiet window.
 */
export function isQuietAt(settings: UserSettings, at: Date): boolean {
  const minutes = at.getHours() * 60 + at.getMinutes();
  const bed = settings.beforeBedTime;
  const wake = settings.firstThingTime;

  if (bed === wake) return false;         // degenerate: no quiet window
  if (bed < wake) {
    // e.g. bed=1, wake=300 — same-day window (unusual but handle it)
    return minutes >= bed && minutes < wake;
  }
  // Normal case: bed=1320 (22:00), wake=300 (05:00) — wraps midnight
  return minutes >= bed || minutes < wake;
}

/**
 * The start of the current "nag day" for an instant — i.e. the most recent
 * firstThingTime boundary at or before `at`. Daily caps count fires since this.
 * A day runs firstThingTime → next firstThingTime, so nags during the small
 * hours count against the day whose morning is about to begin... but since
 * quiet hours suppress those anyway, in practice caps count waking-day fires.
 */
export function nagDayStart(settings: UserSettings, at: Date): Date {
  const wakeMin = settings.firstThingTime;
  const boundary = new Date(at.getFullYear(), at.getMonth(), at.getDate(),
    Math.floor(wakeMin / 60), wakeMin % 60, 0, 0);
  if (at.getTime() >= boundary.getTime()) return boundary;
  // Before this morning's wake time → the day started at yesterday's wake time
  boundary.setDate(boundary.getDate() - 1);
  return boundary;
}

/**
 * Advance an instant to the next non-quiet moment. If `at` is already awake,
 * returns it unchanged; otherwise returns firstThingTime on the appropriate day.
 * Used to push a nag's fire time out of the quiet window rather than dropping it.
 */
export function nextAwakeInstant(settings: UserSettings, at: Date): Date {
  if (!isQuietAt(settings, at)) return at;
  const wakeMin = settings.firstThingTime;
  const wake = new Date(at.getFullYear(), at.getMonth(), at.getDate(),
    Math.floor(wakeMin / 60), wakeMin % 60, 0, 0);
  // If we're past today's wake (i.e. quiet because after bedtime), wake is tomorrow
  if (at.getTime() >= wake.getTime()) wake.setDate(wake.getDate() + 1);
  return wake;
}