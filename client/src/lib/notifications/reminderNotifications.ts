import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import type { Reminder } from '../db/types';

// Android notification IDs are Java ints (32-bit). Our entity IDs are UUIDs,
// so we derive a stable int from the UUID and store the UUID in `extra` for
// the reverse mapping when actions fire.
export function notificationId(entityId: string): number {
  let h = 0;
  for (let i = 0; i < entityId.length; i++) {
    h = (Math.imul(h, 31) + entityId.charCodeAt(i)) | 0;
  }
  return h & 0x7fffffff; // Capacitor requires positive ids
}

export const REMINDER_ACTION_TYPE = 'MONEO_REMINDER';

const isNative = () => Capacitor.isNativePlatform();

/** Idempotent setup: permission + action buttons + channel. Call at app start. */
export async function initReminderNotifications(): Promise<boolean> {
  if (!isNative()) return false;

  const perm = await LocalNotifications.requestPermissions();
  if (perm.display !== 'granted') return false;

  await LocalNotifications.registerActionTypes({
    types: [{
      id: REMINDER_ACTION_TYPE,
      actions: [
        { id: 'done', title: 'Mark done', foreground: false },
        { id: 'snooze', title: 'Snooze 15 min', foreground: false },
      ],
    }],
  });

  return true;
}

export async function scheduleReminderNotification(reminder: Reminder): Promise<void> {
  if (!isNative()) return;

  await LocalNotifications.schedule({
    notifications: [{
      id: notificationId(reminder.id),
      title: reminder.note,
      body: 'Tap to open Moneo',
      schedule: { at: new Date(reminder.remindAt), allowWhileIdle: true },
      actionTypeId: REMINDER_ACTION_TYPE,
      extra: { reminderId: reminder.id },
    }],
  });
}

export async function cancelReminderNotification(reminderId: string): Promise<void> {
  if (!isNative()) return;
  await LocalNotifications.cancel({ notifications: [{ id: notificationId(reminderId) }] });
}

export type ExactAlarmStatus = 'granted' | 'denied' | 'not-applicable';

/** Whether the OS will honor exact scheduling. 'not-applicable' = web/old Android. */
export async function exactAlarmStatus(): Promise<ExactAlarmStatus> {
  if (!isNative()) return 'not-applicable';
  const { exact_alarm } = await LocalNotifications.checkExactNotificationSetting();
  return exact_alarm === 'granted' ? 'granted' : 'denied';
}

/** Deep-link to the system "Alarms & reminders" toggle for this app. */
export async function openExactAlarmSettings(): Promise<void> {
  if (!isNative()) return;
  await LocalNotifications.changeExactNotificationSetting();
}