import type { Category, TimeEntry, UserSettings } from '../../lib/db/types';
import { DEFAULT_CATEGORY_COLOR } from '../../lib/design/color';

export type SummaryPeriod = 'day' | 'week' | 'month';

/** Half-open: [start, end). */
export interface DateRange { start: Date; end: Date }

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * The range a period+anchor covers. Day is the calendar day; week is a
 * trailing 7-day window ending on the anchor day (inclusive) — not a
 * Mon–Sun calendar week; month is the calendar month containing the anchor.
 */
export function periodRange(period: SummaryPeriod, anchor: Date): DateRange {
  const day = startOfDay(anchor);
  if (period === 'day') return { start: day, end: addDays(day, 1) };
  if (period === 'week') return { start: addDays(day, -6), end: addDays(day, 1) };
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
  return { start, end };
}

/** Step the anchor one period back (-1) or forward (+1). */
export function shiftAnchor(period: SummaryPeriod, anchor: Date, dir: -1 | 1): Date {
  if (period === 'day') return addDays(anchor, dir);
  if (period === 'week') return addDays(anchor, dir * 7);
  return new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1);
}

/** True when the period contains "now" — used to hide/disable the › nav. */
export function isCurrentPeriod(period: SummaryPeriod, anchor: Date, now: Date): boolean {
  if (period === 'month') {
    return anchor.getFullYear() === now.getFullYear() && anchor.getMonth() === now.getMonth();
  }
  return startOfDay(anchor).getTime() === startOfDay(now).getTime();
}

/** `Hh MMm` / `Mm`, matching the design's duration formatting exactly. */
export function fmtDuration(minutesIn: number): string {
  const m = Math.round(minutesIn);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h > 0 ? `${h}h ${String(mm).padStart(2, '0')}m` : `${mm}m`;
}

const WEEKDAY_FMT = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const MONTH_DAY_FMT = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const MONTH_SHORT_FMT = new Intl.DateTimeFormat(undefined, { month: 'short' });
const MONTH_LONG_FMT = new Intl.DateTimeFormat(undefined, { month: 'long' });
const MONTH_YEAR_FMT = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });

/** The period-ticker label, e.g. "Today · Mon Jul 20", "Jul 7–13", "July 2026". */
export function periodLabel(period: SummaryPeriod, anchor: Date, now: Date): string {
  if (period === 'day') {
    const label = `${WEEKDAY_FMT.format(anchor)} ${MONTH_DAY_FMT.format(anchor)}`;
    return isCurrentPeriod('day', anchor, now) ? `Today · ${label}` : label;
  }
  if (period === 'week') {
    const { start, end } = periodRange('week', anchor);
    const last = addDays(end, -1);
    const range = start.getMonth() === last.getMonth()
      ? `${MONTH_SHORT_FMT.format(start)} ${start.getDate()}–${last.getDate()}`
      : `${MONTH_SHORT_FMT.format(start)} ${start.getDate()}–${MONTH_SHORT_FMT.format(last)} ${last.getDate()}`;
    return isCurrentPeriod('week', anchor, now) ? `This week · ${range}` : range;
  }
  return MONTH_YEAR_FMT.format(anchor);
}

/** The sub-label under the total headline, e.g. "tracked today" / "tracked in July". */
export function totalSubLabel(period: SummaryPeriod, anchor: Date): string {
  if (period === 'day') return 'tracked today';
  if (period === 'week') return 'tracked this week';
  return `tracked in ${MONTH_LONG_FMT.format(anchor)}`;
}

export interface CategorySlice {
  id: string;
  name: string;
  color: string;
  minutes: number;
  durationLabel: string;
  percentLabel: string;
  widthPct: string;
}

/** Category totals for entries whose start falls in `range`, sorted desc, zero-minute categories dropped. */
export function categorySlices(
  entries: TimeEntry[],
  categories: Category[],
  range: DateRange,
  now: Date,
): { slices: CategorySlice[]; totalMinutes: number } {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const totals = new Map<string, number>();

  for (const e of entries) {
    if (e.isDeleted) continue;
    const start = new Date(e.startedAt);
    if (start < range.start || start >= range.end) continue;
    const end = e.endedAt ? new Date(e.endedAt) : now;
    const minutes = (end.getTime() - start.getTime()) / 60_000;
    totals.set(e.categoryId, (totals.get(e.categoryId) ?? 0) + minutes);
  }

  const totalMinutes = [...totals.values()].reduce((a, b) => a + b, 0);

  const slices = [...totals.entries()]
    .filter(([, minutes]) => minutes > 0)
    .map(([id, minutes]) => {
      const cat = byId.get(id);
      return {
        id,
        name: cat?.name ?? 'Uncategorized',
        color: cat?.color ?? DEFAULT_CATEGORY_COLOR,
        minutes,
        durationLabel: fmtDuration(minutes),
        percentLabel: `${Math.round((minutes / totalMinutes) * 100)}%`,
        widthPct: `${(minutes / totalMinutes) * 100}%`,
      };
    })
    .sort((a, b) => b.minutes - a.minutes);

  return { slices, totalMinutes };
}

/** Waking-hours window length in minutes, from settings if available, else the 16h (07:00–23:00) default. */
function wakingMinutesPerDay(settings: UserSettings | undefined): number {
  const DEFAULT_WAKING = 16 * 60;
  if (!settings) return DEFAULT_WAKING;
  const wake = settings.firstThingTime;
  const bed = settings.beforeBedTime;
  if (wake === bed) return 24 * 60; // degenerate: no quiet window configured
  const quiet = bed < wake ? wake - bed : (1440 - bed) + wake;
  return 1440 - quiet;
}

export interface Coverage {
  fillPct: number;
  leftLabel: string;
  rightLabel: string;
}

/** Tracked-vs-untracked coverage, per the per-period formula in the handoff. */
export function computeCoverage(
  period: SummaryPeriod,
  totalMinutes: number,
  range: DateRange,
  entries: TimeEntry[],
  settings: UserSettings | undefined,
): Coverage {
  const waking = wakingMinutesPerDay(settings);

  if (period === 'day') {
    const ratio = totalMinutes / waking;
    const untracked = Math.max(0, waking - totalMinutes);
    return {
      fillPct: clamp(ratio * 100, 0, 100),
      leftLabel: `${Math.round(ratio * 100)}% of your waking day`,
      rightLabel: `${fmtDuration(untracked)} untracked`,
    };
  }

  if (period === 'week') {
    const wakingWeek = waking * 7;
    const ratio = totalMinutes / wakingWeek;
    return {
      fillPct: clamp(ratio * 100, 0, 100),
      leftLabel: `${fmtDuration(totalMinutes)} of ~${Math.round(wakingWeek / 60)} waking hours`,
      rightLabel: `${Math.round(ratio * 100)}% coverage`,
    };
  }

  // month: days-with-≥1-entry ÷ days-in-month
  const daysInMonth = Math.round((range.end.getTime() - range.start.getTime()) / DAY_MS);
  const trackedDays = new Set<string>();
  for (const e of entries) {
    if (e.isDeleted) continue;
    const start = new Date(e.startedAt);
    if (start < range.start || start >= range.end) continue;
    trackedDays.add(dateKey(start));
  }
  const ratio = daysInMonth > 0 ? trackedDays.size / daysInMonth : 0;
  const phrase = ratio >= 0.75 ? 'a steady rhythm' : ratio >= 0.4 ? 'a mixed month' : 'a quiet month';
  return {
    fillPct: clamp(ratio * 100, 0, 100),
    leftLabel: `${trackedDays.size} of ${daysInMonth} days tracked`,
    rightLabel: phrase,
  };
}
