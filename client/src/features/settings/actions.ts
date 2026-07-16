import { update } from '../../lib/db/repo';
import { requestSync } from '../../lib/sync/scheduler';
import { reconcileNags } from '../tracking/nagScheduler';
import type { TrackerStrictness, UserSettings } from '../../lib/db/types';

type SlotField =
  | 'firstThingTime' | 'morningTime' | 'middayTime'
  | 'afternoonTime' | 'eveningTime' | 'beforeBedTime';

export async function setSlotTime(settingsId: string, field: SlotField, minutes: number): Promise<void> {
  await update('settings', settingsId, { [field]: minutes } as Partial<UserSettings>);
  await reconcileNags(); // beforeBed/firstThing are the quiet-hours bounds
  requestSync();
}

export async function setStrictness(settingsId: string, strictness: TrackerStrictness): Promise<void> {
  await update('settings', settingsId, { trackerStrictness: strictness });
  await reconcileNags(); // cadence changed
  requestSync();
}