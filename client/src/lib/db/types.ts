// Enums: const objects, not TS `enum` (erasable, tree-shakeable, works with `verbatimModuleSyntax`)
export const Priority = { None: 0, Low: 1, Medium: 2, High: 3, Urgent: 4 } as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

export const ReminderStatus = { Pending: 0, Fired: 1, Completed: 2, Cancelled: 3 } as const;
export type ReminderStatus = (typeof ReminderStatus)[keyof typeof ReminderStatus];

export const CompletionSource = { InApp: 0, NotificationAction: 1, LinkedTodo: 2 } as const;
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
  categoryId: string | null;
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
  categoryId: string | null;
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