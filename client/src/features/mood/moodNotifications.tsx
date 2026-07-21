import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { db } from '../../lib/db/db';
import { currentMoodDate } from './moodDate';
import { isCheckInStarted } from './actions';


const isNative = () => Capacitor.isNativePlatform();

// Own ID range, separate from reminders (UUID-hash) and nags (2_000_000_000+).
const MOOD_BEDTIME_ID = 2_100_000_000;
const MOOD_CATCHUP_ID = 2_100_000_001;
const MOOD_OFFSET_MIN = 15; // fires 15 min past the slot, to avoid clustering with user reminders

const CHANNEL_ID = 'moneo-checkin-v1';
export const MOOD_NOTIFICATION_TYPE = 'MOOD_CHECKIN';

/** Register the tap action (opens the app; the listener routes to the Mood tab). */
export async function initMoodNotifications(): Promise<void> {
  if (!isNative()) return;
  
  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: 'Daily Check-In',
    importance: 4,
    visibility: 1,
    sound: 'poke',
    vibration: true,
  });

  await LocalNotifications.registerActionTypes({
    types: [{ id: MOOD_NOTIFICATION_TYPE, actions: [] }],
  });
}

/**
 * Reconcile the two mood prompts against today's check-in state.
 * Call on: app start/foreground, after a check-in completes, settings change.
 */
export async function reconcileMoodNotifications(): Promise<void> {
  if (!isNative()) return;

  // Always clear both first (idempotent).
  await LocalNotifications.cancel({
    notifications: [{ id: MOOD_BEDTIME_ID }, { id: MOOD_CATCHUP_ID }],
  });

  const settings = await db.settings.filter((s) => !s.isDeleted).first();
  if (!settings) return;

  const now = new Date();
  const todayMoodDate = currentMoodDate(settings, now);
  const todayEntry = await db.moodEntries
    .filter((m) => !m.isDeleted && m.moodDate === todayMoodDate)
    .first();

  const notifications = [];

  // --- Bedtime prompt: beforeBedTime + 15, if today isn't checked in yet ---
  if (!isCheckInStarted(todayEntry)) {
    const bedtimeAt = slotTimePlusOffset(now, settings.beforeBedTime, MOOD_OFFSET_MIN, /*allowPast*/ false);
    if (bedtimeAt) {
      notifications.push({
        id: MOOD_BEDTIME_ID,
        title: 'How was your day?',
        body: 'Take a minute for your daily check-in.',
        channelId: CHANNEL_ID,
        schedule: { at: bedtimeAt, allowWhileIdle: true },
        actionTypeId: MOOD_NOTIFICATION_TYPE,
        extra: { moodCheckIn: true },
      });
    }
  }

  // --- Morning catch-up: tomorrow's firstThingTime + 15, if YESTERDAY is unchecked ---
  // (i.e., if today's check-in gets missed, remind next morning to back-fill it.)
  // We schedule tomorrow-morning's catch-up for TODAY's moodDate, conditional on
  // today still being unchecked at schedule time. It self-cancels on reconcile
  // once today's entry exists.
  if (!isCheckInStarted(todayEntry)) {
    const catchupAt = tomorrowSlotPlusOffset(now, settings.firstThingTime, MOOD_OFFSET_MIN);
    notifications.push({
      id: MOOD_CATCHUP_ID,
      title: 'You missed yesterday’s check-in',
      body: 'Want to fill it in? It only takes a minute.',
      channelId: CHANNEL_ID,
      schedule: { at: catchupAt, allowWhileIdle: true },
      actionTypeId: MOOD_NOTIFICATION_TYPE,
      extra: { moodCheckIn: true },
    });
  }

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }
}

/** Today at (slotMinutes + offset), or null if that time is already past. */
function slotTimePlusOffset(now: Date, slotMinutes: number, offsetMin: number, allowPast: boolean): Date | null {
  const total = slotMinutes + offsetMin;
  const at = new Date(now);
  at.setHours(Math.floor(total / 60), total % 60, 0, 0);
  if (!allowPast && at.getTime() <= now.getTime()) return null;
  return at;
}

/** Tomorrow at (slotMinutes + offset). */
function tomorrowSlotPlusOffset(now: Date, slotMinutes: number, offsetMin: number): Date {
  const total = slotMinutes + offsetMin;
  const at = new Date(now);
  at.setDate(at.getDate() + 1);
  at.setHours(Math.floor(total / 60), total % 60, 0, 0);
  return at;
}