import { useLiveQuery } from 'dexie-react-hooks';
import { useSettings } from '../settings/queries';
import { useNow } from '../reminders/actions';
import { recentMoodDays, isCheckInStarted, type MoodDay } from './actions';
import { currentMoodDate, fromDateString } from './moodDate';
import { DayRating, Productivity, type MoodEntry } from '../../lib/db/types';
import { useNav } from '../../app/navStore';
import { QUESTIONS } from './questions';
import { GHOST_TEXT, optionRampColor } from './checkInTheme';

// Short labels for the Q1/Q2 summary (subset of the full option labels).
const DAY_LABEL: Record<number, string> = {
  [DayRating.Awful]: 'Awful', [DayRating.Challenging]: 'Challenging',
  [DayRating.Okay]: 'Okay', [DayRating.Good]: 'Good', [DayRating.Fantastic]: 'Fantastic',
};
const PROD_LABEL: Record<number, string> = {
  [Productivity.NotAtAll]: 'Not at all', [Productivity.NotVery]: 'Not very',
  [Productivity.Somewhat]: 'Somewhat', [Productivity.Fairly]: 'Fairly', [Productivity.CrushedIt]: 'Crushed it',
};
/** Color for a given answer value, reusing the check-in's scale ramp. */
function ratingColor(field: 'dayRating' | 'productivity', value: number): string {
  const q = QUESTIONS.find((x) => x.field === field);
  if (!q) return 'inherit';
  const idx = q.options.findIndex((o) => o.value === value);
  return idx === -1 ? 'inherit' : optionRampColor(q.options, idx);
}

const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

export function MoodScreen() {
  const settings = useSettings();
  const now = useNow(60_000); // minute granularity is plenty here
  const { startCheckIn } = useNav();

  // useLiveQuery so the list refreshes when an entry is created/updated/synced.
  const days = useLiveQuery(
    async () => (settings ? recentMoodDays(settings, now, 30) : undefined),
    [settings, now],
  );

  if (!settings || !days) return <p className="p-4 text-muted">Loading…</p>;

  const today = days[0]; // recentMoodDays returns most-recent-first
  const todayDone = isCheckInStarted(today.entry);
  const todayMoodDate = currentMoodDate(settings, now);

  return (
    <div className="mx-auto max-w-md p-4">
      <h2 className="mb-4 text-[22px] font-bold text-ink">Mood</h2>

      {/* Today's check-in CTA */}
      {todayDone ? (
        <button
          onClick={() => startCheckIn(todayMoodDate)}
          className="mb-6 w-full rounded-15 border border-white/10 bg-surface p-4 text-left"
        >
          <div className="text-[13px] text-muted">Today · checked in</div>
          <MoodSummary entry={today.entry!} />
          <div className="mt-1 text-[12px] text-accent">Tap to review or edit</div>
        </button>
      ) : (
        <button
          onClick={() => startCheckIn(todayMoodDate)}
          className="mb-6 w-full rounded-15 border bg-border/40 bg-accent/10 py-4 text-[17px] font-bold text-accent"
        >
          Start today's check-in
        </button>
      )}

      {/* History */}
      <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted">Past days</h3>
      <ul className="flex flex-col gap-2">
        {days.slice(1).map((d) => (
          <HistoryRow key={d.moodDate} day={d} onCheckIn={() => startCheckIn(d.moodDate)} />
        ))}
      </ul>
    </div>
  );
}

function MoodSummary({ entry }: { entry: MoodEntry }) {
  return (
    <div
      className="mt-1 flex gap-4 text-[15px]"
      style={{ justifyContent: "space-between" }}>
      {entry.dayRating !== null && (
        <span style={{ color: GHOST_TEXT }}>
          Day: <strong style={{ color: ratingColor('dayRating', entry.dayRating) }}>
            {DAY_LABEL[entry.dayRating]}
          </strong>
        </span>
      )}
      {entry.productivity !== null && (
        <span style={{ color: GHOST_TEXT }}>
          Productivity: <strong style={{ color: ratingColor('productivity', entry.productivity) }}>
            {PROD_LABEL[entry.productivity]}
          </strong>
        </span>
      )}
    </div>
  );
}

function HistoryRow({ day, onCheckIn }: { day: MoodDay; onCheckIn: () => void }) {
  const label = dayFmt.format(fromDateString(day.moodDate));
  const done = isCheckInStarted(day.entry);

  if (done) {
    return (
      <li>
        <button onClick={onCheckIn} className="w-full rounded-14 border border-white/8 bg-surface p-3 text-left">
          <div className="text-[13px] text-muted">{label}</div>
          <MoodSummary entry={day.entry!} />
        </button>
      </li>
    );
  }

  return (
    <li>
      <button onClick={onCheckIn}
        className="flex w-full items-center justify-between rounded-14 border border-dashed border-white/15 p-3 text-left">
        <span className="text-[13px] text-muted">{label}</span>
        <span className="text-[13px] font-semibold text-danger">Missed · check in →</span>
      </button>
    </li>
  );
}