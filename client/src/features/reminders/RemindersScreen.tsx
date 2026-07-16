import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db/db';
import { ReminderComposer } from './ReminderComposer';
import { ReminderStatus } from '../../lib/db/types';
import { useEffect, useState } from 'react';
import { exactAlarmStatus, openExactAlarmSettings, type ExactAlarmStatus } from '../../lib/notifications/reminderNotifications';

const fmt = new Intl.DateTimeFormat(undefined, {
  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
});

export function RemindersScreen() {
  const [exactStatus, setExactStatus] = useState<ExactAlarmStatus>('not-applicable');
  useEffect(() => { void exactAlarmStatus().then(setExactStatus); }, []);

  const pending = useLiveQuery(async () =>
    (await db.reminders
      .where('status').equals(ReminderStatus.Pending)
      .filter((r) => !r.isDeleted)
      .toArray()
    ).sort((a, b) => a.remindAt.localeCompare(b.remindAt)),
  );

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
      <h2>Reminders</h2>
      {exactStatus === 'denied' && (
        <div style={{ background: '#FEF3C7', padding: 8, borderRadius: 8, fontSize: 14 }}>
          Reminders may arrive late — exact alarms are off.{' '}
          <button onClick={() => void openExactAlarmSettings()}
            style={{ border: 'none', background: 'none', color: '#B45309', cursor: 'pointer', textDecoration: 'underline' }}>
            Fix in settings
          </button>
        </div>
      )}
      <ReminderComposer />
      <ul style={{ listStyle: 'none', padding: 0, marginTop: 24 }}>
        {pending?.map((r) => (
          <li key={r.id} style={{ padding: '6px 0', borderBottom: '1px solid #eee' }}>
            {r.note} <small style={{ color: '#666' }}>{fmt.format(new Date(r.remindAt))}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}