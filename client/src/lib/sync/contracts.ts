import type { Category, Todo, Reminder, TimeEntry, UserSettings } from '../db/types';

export interface PushRequest {
  categories?: Category[];
  todos?: Todo[];
  reminders?: Reminder[];
  timeEntries?: TimeEntry[];
  settings?: UserSettings[];
}

export interface ItemResult {
  status: 'applied' | 'skippedStale' | 'rejected';
  reason?: string | null;
}

export interface PushResponse {
  results: Record<string, ItemResult>;
}

export interface PullResponse {
  categories: Category[];
  todos: Todo[];
  reminders: Reminder[];
  timeEntries: TimeEntry[];
  settings: UserSettings[];
  cursor: string;
}