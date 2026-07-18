import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { completeReminder, snoozeReminder, markReminderFired } from '../../features/reminders/actions';
import { db } from '../db/db';
import { CompletionSource, ReminderStatus } from '../db/types';
import { logNagFired } from '../../features/tracking/nagLog';
import { useNav } from '../../app/navStore';

export function startNotificationListeners(): void {
  if (!Capacitor.isNativePlatform()) return;

  // Fires when a notification is delivered while the app is foregrounded.
  // (Backgrounded delivery has no JS callback — see catch-up note.)
  void LocalNotifications.addListener('localNotificationReceived', (n) => {
    const id = (n.extra as { reminderId?: string })?.reminderId;
    if (id) void markReminderFired(id);
  });

  void LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
      const moodExtra = event.notification.extra as { moodCheckIn?: boolean } | undefined;
      if (moodExtra?.moodCheckIn) {
        useNav.getState().go('mood');
        return;
      }

    const id = (event.notification.extra as { reminderId?: string })?.reminderId;
    if (!id) return;

    switch (event.actionId) {
      case 'done':
        void completeReminder(id, CompletionSource.NotificationAction);
        void LocalNotifications.cancel({ notifications: [{ id: event.notification.id }] });
        break;
      case 'snooze':
        void snoozeReminder(id);
        void LocalNotifications.cancel({ notifications: [{ id: event.notification.id }] });
        break;
      case 'tap':
        useNav.getState().go('todos');
        break;
    }
  });
}

export async function catchUpFiredReminders(): Promise<void> {
  const nowIso = new Date().toISOString();
  const overdue = await db.reminders
    .where('status').equals(ReminderStatus.Pending)
    .filter((r) => !r.isDeleted && r.remindAt <= nowIso)
    .toArray();

  for (const r of overdue) void markReminderFired(r.id);
}

void LocalNotifications.addListener('localNotificationReceived', (n) => {
  const extra = n.extra as { reminderId?: string; nag?: boolean } | undefined;
  if (extra?.reminderId) void markReminderFired(extra.reminderId);
  if (extra?.nag) void logNagFired();
});