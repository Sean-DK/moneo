import { create } from 'zustand';

export type Tab = 'reminders' | 'todos' | 'time' | 'mood' | 'settings';

// navStore.ts
interface NavState {
  tab: Tab;
  editingTodoId: string | null;
  go: (tab: Tab) => void;
  editTodo: (id: string) => void;
  closeEdit: () => void;
  checkInDate: string | null;   // moodDate being checked in, or null
  startCheckIn: (moodDate: string) => void;
  closeCheckIn: () => void;
  editingEntryId: string | null;
  editEntry: (id: string) => void;
  closeEntryEdit: () => void;
  showTimeSummary: boolean;
  openTimeSummary: () => void;
  closeTimeSummary: () => void;
}
export const useNav = create<NavState>((set) => ({
  tab: 'time',
  editingTodoId: null,
  go: (tab) => set({ tab, editingTodoId: null, showTimeSummary: false }),
  editTodo: (id) => set({ editingTodoId: id }),
  closeEdit: () => set({ editingTodoId: null }),
  checkInDate: null,
  startCheckIn: (moodDate) => set({ checkInDate: moodDate }),
  closeCheckIn: () => set({ checkInDate: null }),
  editingEntryId: null,
  editEntry: (id) => set({ editingEntryId: id }),
  closeEntryEdit: () => set({ editingEntryId: null }),
  showTimeSummary: false,
  openTimeSummary: () => set({ showTimeSummary: true }),
  closeTimeSummary: () => set({ showTimeSummary: false }),
}));