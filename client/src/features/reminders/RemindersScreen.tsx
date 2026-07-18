import { useEffect, useState } from 'react';
import { ReminderComposer } from './ReminderComposer';
import { exactAlarmStatus, openExactAlarmSettings, type ExactAlarmStatus } from '../../lib/notifications/reminderNotifications';

export function RemindersScreen() {
  const [exactStatus, setExactStatus] = useState<ExactAlarmStatus>('not-applicable');
  useEffect(() => { void exactAlarmStatus().then(setExactStatus); }, []);

  return (
    <div className="flex flex-col gap-4 pb-3.5">
      {exactStatus === 'denied' && (
        <div className="rounded-13 border border-priority-medium/40 bg-priority-medium/10 px-3 py-2 text-[13px] text-ink">
          Reminders may arrive late — exact alarms are off.{' '}
          <button
            onClick={() => void openExactAlarmSettings()}
            className="font-semibold text-priority-medium underline"
          >
            Fix in settings
          </button>
        </div>
      )}

      <ReminderComposer />
    </div>
  );
}
