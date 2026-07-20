// Enums: const objects, not TS `enum` (erasable, tree-shakeable, works with `verbatimModuleSyntax`)
export const Priority = { None: 0, Low: 1, Medium: 2, High: 3, Urgent: 4 } as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

export const ReminderStatus = { Pending: 0, Fired: 1, Completed: 2, Cancelled: 3 } as const;
export type ReminderStatus = (typeof ReminderStatus)[keyof typeof ReminderStatus];

export const CompletionSource = {
  InApp: 0,
  NotificationAction: 1,
  LinkedTodo: 2,
  LinkedTodoDeleted: 3,
  UserCancelledReminder: 4,
} as const;
export type CompletionSource = (typeof CompletionSource)[keyof typeof CompletionSource];

export const TimeEntrySource = { Timer: 0, Manual: 1 } as const;
export type TimeEntrySource = (typeof TimeEntrySource)[keyof typeof TimeEntrySource];

export const TimerStopSource = { User: 0, AutoNextTimer: 1 } as const;
export type TimerStopSource = (typeof TimerStopSource)[keyof typeof TimerStopSource];

export const TrackerStrictness = {
  LeaveMeAlone: 0, Lenient: 1, Firm: 2, Strict: 3, Draconian: 4,
} as const;
export type TrackerStrictness = (typeof TrackerStrictness)[keyof typeof TrackerStrictness];

// Base fields every syncable row carries (UserId deliberately absent — the
// device is single-user; the server stamps ownership)
export interface Syncable {
  id: string;          // UUIDv7, client-generated
  createdAt: string;   // ISO 8601
  modifiedAt: string;  // ISO 8601 — the LWW clock
  isDeleted: boolean;
}

export interface Category extends Syncable {
  name: string;
  color: string | null;
  sortOrder: number;
  isSystem: boolean;
}

export interface Todo extends Syncable {
  note: string;
  priority: Priority;
  categoryId: string;
  isCompleted: boolean;
  completedAt: string | null;
  sourceReminderId: string | null;
  completionSource: CompletionSource | null;
}

export interface Reminder extends Syncable {
  note: string;
  priority: Priority;
  categoryId: string | null;
  remindAt: string;
  status: ReminderStatus;
  todoId: string;
  firedAt: string | null;
  completedAt: string | null;
  completionSource: CompletionSource | null;
  presetUsed: string | null;
  snoozeCount: number;
  originalRemindAt: string | null;
}

export interface TimeEntry extends Syncable {
  name: string;
  categoryId: string;
  startedAt: string;
  endedAt: string | null;   // null = timer running
  source: TimeEntrySource;
  editCount: number;
  stoppedBy: TimerStopSource | null;
}

export interface UserSettings extends Syncable {
  firstThingTime: number;   // minutes from midnight
  morningTime: number;
  middayTime: number;
  afternoonTime: number;
  eveningTime: number;
  beforeBedTime: number;
  trackerStrictness: TrackerStrictness;
}

// --- Mood enums ---
export const DayRating = { Awful: 1, Challenging: 2, Okay: 3, Good: 4, Fantastic: 5 } as const;
export type DayRating = (typeof DayRating)[keyof typeof DayRating];

export const Productivity = { NotAtAll: 1, NotVery: 2, Somewhat: 3, Fairly: 4, CrushedIt: 5 } as const;
export type Productivity = (typeof Productivity)[keyof typeof Productivity];

export const Weather = { DontKnow: 0, Sunny: 1, Cloudy: 2, Rainy: 3, Snowy: 4 } as const;
export type Weather = (typeof Weather)[keyof typeof Weather];

export const Location = { Inside: 1, Outside: 2, Both: 3 } as const;
export type Location = (typeof Location)[keyof typeof Location];

export const FreeTime = { DontKnow: 0, None: 1, NotEnough: 2, Enough: 3, MoreThanEnough: 4 } as const;
export type FreeTime = (typeof FreeTime)[keyof typeof FreeTime];

export const Social = { NotAtAll: 1, ALittle: 2, Somewhat: 3, Very: 4 } as const;
export type Social = (typeof Social)[keyof typeof Social];

export const Sleep = { DontKnow: 0, Poorly: 1, Okay: 2, Great: 3 } as const;
export type Sleep = (typeof Sleep)[keyof typeof Sleep];

export const AteWell = { DontKnow: 0, No: 1, NotReally: 2, IThinkSo: 3, Yes: 4 } as const;
export type AteWell = (typeof AteWell)[keyof typeof AteWell];

export const Exercise = { No: 0, Tried: 1, Yes: 2 } as const;
export type Exercise = (typeof Exercise)[keyof typeof Exercise];

export const Sickness = { No: 0, ALittleOff: 1, Yes: 2 } as const;         // high = worse
export type Sickness = (typeof Sickness)[keyof typeof Sickness];

export const StressEvent = { No: 0, YesABit: 1, YesBadly: 2 } as const;    // high = worse
export type StressEvent = (typeof StressEvent)[keyof typeof StressEvent];

export const GoodEvent = { No: 0, ANiceMoment: 1, MadeMyDay: 2 } as const;
export type GoodEvent = (typeof GoodEvent)[keyof typeof GoodEvent];

export const Outlook = { DreadingIt: 1, Worried: 2, Indifferent: 3, Excited: 4, CantWait: 5 } as const;
export type Outlook = (typeof Outlook)[keyof typeof Outlook];

// Q4 activity buckets — bitmask (multi-select). Combine with bitwise OR.
export const Activities = {
  None: 0, Working: 1, ChoresErrands: 2, Hobbies: 4, Relaxing: 8, Socializing: 16,
} as const;
export type Activities = number; // a bitmask, not a single enum member

// --- The entity. All answer fields nullable: null = not yet answered (progressive save). ---
export interface MoodEntry extends Syncable {
  moodDate: string;                        // "YYYY-MM-DD", the join key
  dayRating: DayRating | null;
  productivity: Productivity | null;
  weather: Weather | null;
  activities: number | null;               // bitmask; null = unanswered
  activitiesChaotic: boolean | null;
  location: Location | null;
  freeTime: FreeTime | null;
  social: Social | null;
  sleep: Sleep | null;
  ateWell: AteWell | null;
  exercise: Exercise | null;
  sickness: Sickness | null;
  stressEvent: StressEvent | null;
  goodEvent: GoodEvent | null;
  outlook: Outlook | null;
  laughed: boolean | null;
  repeatDay: boolean | null;
  repeatDayAutoSkipped: boolean;           // not nullable — system-set, always defined
}

export type MoodField = Exclude<
  keyof MoodEntry,
  keyof Syncable | 'moodDate' | 'repeatDayAutoSkipped'
>;