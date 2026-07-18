import { db } from '../../lib/db/db';
import { create, update } from '../../lib/db/repo';
import { requestSync } from '../../lib/sync/scheduler';
import type { MoodEntry, MoodField } from '../../lib/db/types';
import { currentMoodDate, fromDateString, toDateString } from './moodDate';
import type { UserSettings } from '../../lib/db/types';
import { DayRating } from '../../lib/db/types';
import { reconcileMoodNotifications } from './moodNotifications';
import { QUESTIONS } from './questions';

/** Get (or create) the MoodEntry for a given moodDate. Progressive-save anchor. */
export async function getOrCreateMoodEntry(moodDate: string): Promise<MoodEntry> {
  const existing = await db.moodEntries.filter((m) => !m.isDeleted && m.moodDate === moodDate).first();
  if (existing) return existing;

  return create('moodEntries', {
    moodDate,
    dayRating: null, productivity: null, weather: null, activities: null,
    activitiesChaotic: null, location: null, freeTime: null, social: null,
    sleep: null, ateWell: null, exercise: null, sickness: null,
    stressEvent: null, goodEvent: null, outlook: null,
    laughed: null, repeatDay: null, repeatDayAutoSkipped: false,
  });
}

/** Write a single answer (progressive save — called on each tap). */
export async function answerQuestion(
  entryId: string,
  field: MoodField,
  value: number | boolean | null,
): Promise<void> {
  await update('moodEntries', entryId, { [field]: value } as Partial<MoodEntry>);
  requestSync();
}

/** Q4 special: set activities bitmask + clear chaotic (they're mutually exclusive). */
export async function setActivities(entryId: string, bitmask: number): Promise<void> {
  await update('moodEntries', entryId, { activities: bitmask, activitiesChaotic: false });
  requestSync();
}

export async function setActivitiesChaotic(entryId: string): Promise<void> {
  await update('moodEntries', entryId, { activities: 0, activitiesChaotic: true });
  requestSync();
}

/** Whether Q16 should be skipped, per the locked rule. */
export function shouldSkipRepeatDay(entry: MoodEntry): boolean {
  const day = entry.dayRating;
  const outlook = entry.outlook;
  if (day === DayRating.Awful) return true;
  if (day !== null && outlook !== null && day + outlook <= 4) return true;
  return false;
}

/** Finalize: set repeatDay (or auto-skip). */
export async function finishCheckIn(
  entry: MoodEntry,
  repeatDayAnswer: boolean | null, // null when auto-skipped
): Promise<void> {
  const skipped = shouldSkipRepeatDay(entry);
  await update('moodEntries', entry.id, {
    repeatDay: skipped ? false : repeatDayAnswer,
    repeatDayAutoSkipped: skipped,
  });
  requestSync();
  void reconcileMoodNotifications();
}

/** Today's entry (for the Mood tab status + resuming). */
export async function todaysEntry(settings: UserSettings, now: Date): Promise<MoodEntry | undefined> {
  const md = currentMoodDate(settings, now);
  return db.moodEntries.filter((m) => !m.isDeleted && m.moodDate === md).first();
}

export interface MoodDay {
  moodDate: string;
  entry: MoodEntry | undefined;   // undefined = missed (no check-in that day)
  isToday: boolean;
}

/** Build the last N days (most recent first), each with its entry if one exists. */
export async function recentMoodDays(
  settings: UserSettings,
  now: Date,
  days = 30,
): Promise<MoodDay[]> {
  const today = currentMoodDate(settings, now);
  const entries = await db.moodEntries.filter((m) => !m.isDeleted).toArray();
  const byDate = new Map(entries.map((e) => [e.moodDate, e]));

  const todayStart = fromDateString(today);
  const result: MoodDay[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - i);
    const md = toDateString(d);
    result.push({ moodDate: md, entry: byDate.get(md), isToday: md === today });
  }
  return result;
}

/** Is today's check-in complete? (dayRating answered = the minimum "did it".) */
export function isCheckInStarted(entry: MoodEntry | undefined): boolean {
  return !!entry && entry.dayRating !== null;
}

/**
 * The step to open a check-in at:
 *  - fresh/partial → first unanswered question
 *  - complete      → 0 (start fresh for a re-do/edit)
 */
export function resumeStep(entry: MoodEntry): number {
  const firstUnanswered = QUESTIONS.findIndex((q) => entry[q.field] === null);
  if (firstUnanswered === -1) return 0;  // all config questions answered → complete → restart
  return firstUnanswered;
}