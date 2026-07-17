import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db } from '../../lib/db/db';
import { ReminderComposer } from './ReminderComposer';
import { Priority, ReminderStatus } from '../../lib/db/types';
import { exactAlarmStatus, openExactAlarmSettings, type ExactAlarmStatus } from '../../lib/notifications/reminderNotifications';
import { useCategories } from '../categories/queries';
import { SectionLabel } from '../../components/SectionLabel';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../../lib/design/priority';
import { DEFAULT_CATEGORY_COLOR, tint } from '../../lib/design/color';

const fmt = new Intl.DateTimeFormat(undefined, {
  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
});

export function RemindersScreen() {
  const [exactStatus, setExactStatus] = useState<ExactAlarmStatus>('not-applicable');
  useEffect(() => { void exactAlarmStatus().then(setExactStatus); }, []);

  const categories = useCategories();
  const pending = useLiveQuery(async () =>
    (await db.reminders
      .where('status').equals(ReminderStatus.Pending)
      .filter((r) => !r.isDeleted)
      .toArray()
    ).sort((a, b) => a.remindAt.localeCompare(b.remindAt)),
  );

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

      {/*pending && pending.length > 0 && (
        <div>
          <SectionLabel>upcoming</SectionLabel>
          <ul className="flex flex-col">
            {pending.map((r) => {
              const category = categories?.find((c) => c.id === r.categoryId);
              return (
                <li key={r.id} className="flex items-center gap-2.5 border-b border-white/6 py-3.25">
                  <span className="flex-1 truncate text-[15px] font-medium text-ink">{r.note}</span>
                  {r.priority !== Priority.None && (
                    <span
                      className="shrink-0 rounded-7 px-2 py-0.5 text-[10.5px] font-bold"
                      style={{ background: tint(PRIORITY_COLORS[r.priority], 0.16), color: PRIORITY_COLORS[r.priority] }}
                    >
                      {PRIORITY_LABELS[r.priority]}
                    </span>
                  )}
                  <span className="shrink-0 font-mono text-[11.5px] text-muted">{fmt.format(new Date(r.remindAt))}</span>
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: category?.color ?? DEFAULT_CATEGORY_COLOR }}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )*/}
    </div>
  );
}
