import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { db } from '../../lib/db/db';
import { TrackerStrictness, type UserSettings, type TimeEntry } from '../../lib/db/types';
import { inQuietHours } from './nagWindow';
import { nagsFiredToday, pruneNagLog } from './nagLog';

const isNative = () => Capacitor.isNativePlatform();

const NAG_ID_BASE = 2_000_000_000;
const NAG_HORIZON = 6; // how many future nags we keep queued at once

interface Cadence {
  runningMin: number | null;   // gap between running-timer nags; null = none
  idleMin: number | null;      // gap between idle nags; null = none
  idleCap: number | null;      // max idle nags per nag-day; null = unlimited
  idleFirstMin: number;        // delay before the FIRST idle nag
}

function cadence(s: TrackerStrictness): Cadence {
  switch (s) {
    case TrackerStrictness.LeaveMeAlone:
      return { runningMin: null, idleMin: null, idleCap: 0, idleFirstMin: 60 };
    case TrackerStrictness.Lenient:
      return { runningMin: 240, idleMin: 60, idleCap: 2, idleFirstMin: 60 };
    case TrackerStrictness.Firm:
      return { runningMin: 120, idleMin: 60, idleCap: 4, idleFirstMin: 60 };
    case TrackerStrictness.Strict:
      return { runningMin: 120, idleMin: 60, idleCap: null, idleFirstMin: 60 };
    case TrackerStrictness.Draconian:
      return { runningMin: 60, idleMin: 60, idleCap: null, idleFirstMin: 1 }; // ~immediate
  }
}

async function clearNags(): Promise<void> {
  const ids = Array.from({ length: NAG_HORIZON }, (_, i) => ({ id: NAG_ID_BASE + i }));
  await LocalNotifications.cancel({ notifications: ids });
}

/**
 * Reconcile scheduled nags with current state. Call on: app start/foreground,
 * timer start/stop, settings change. Idempotent — always clears then reschedules.
 */
export async function reconcileNags(): Promise<void> {
  if (!isNative()) return;

  await clearNags();
  const now = new Date();
  await pruneNagLog(now);

  const settings = await db.settings.filter((s) => !s.isDeleted).first();
  if (!settings) return;

  const running = await db.timeEntries.filter((e) => !e.isDeleted && e.endedAt === null).first();
  const c = cadence(settings.trackerStrictness);

  const notifications = running
    ? buildRunningNags(running, c, settings, now)
    : await buildIdleNags(c, settings, now);

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }
}

function buildRunningNags(
  running: TimeEntry, c: Cadence, settings: UserSettings, now: Date,
) {
  if (c.runningMin === null) return [];
  const out = [];
  for (let i = 0; i < NAG_HORIZON; i++) {
    const fireAt = new Date(now.getTime() + c.runningMin * 60_000 * (i + 1));
    if (inQuietHours(settings, fireAt)) continue; // suppress overnight
    out.push({
      id: NAG_ID_BASE + i,
      title: `Still working on "${running.name}"?`,
      body: runningBody(running.startedAt, fireAt),
      schedule: { at: fireAt, allowWhileIdle: true },
      extra: { nag: true },
    });
  }
  return out;
}

async function buildIdleNags(c: Cadence, settings: UserSettings, now: Date) {
  if (c.idleMin === null) return [];

  // Daily cap: subtract nags already fired this nag-day.
  let remaining = NAG_HORIZON;
  if (c.idleCap !== null) {
    const firedToday = await nagsFiredToday(settings, now);
    remaining = Math.max(0, Math.min(NAG_HORIZON, c.idleCap - firedToday));
    if (remaining === 0) return [];
  }

  const out = [];
  for (let i = 0; i < NAG_HORIZON && out.length < remaining; i++) {
    const delayMin = c.idleFirstMin + c.idleMin * i;
    const fireAt = new Date(now.getTime() + delayMin * 60_000);
    if (inQuietHours(settings, fireAt)) continue;
    out.push({
      id: NAG_ID_BASE + out.length,
      title: 'Track your time',
      body: 'What are you doing right now?',
      schedule: { at: fireAt, allowWhileIdle: true },
      extra: { nag: true },
    });
  }
  return out;
}

/** Duration-aware copy — the "did you forget?" case for long-running timers. */
function runningBody(startedAt: string, fireAt: Date): string {
  const hours = (fireAt.getTime() - new Date(startedAt).getTime()) / 3_600_000;
  if (hours >= 12) return `This timer will have run ${Math.round(hours)} hours — did you forget to stop it?`;
  if (hours >= 1) return `Running ${Math.round(hours)}h. Tap to update if you've moved on.`;
  return "Tap to update if you've switched tasks.";
}