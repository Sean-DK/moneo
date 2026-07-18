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
}
export const useNav = create<NavState>((set) => ({
  tab: 'reminders',
  editingTodoId: null,
  go: (tab) => set({ tab, editingTodoId: null }),
  editTodo: (id) => set({ editingTodoId: id }),
  closeEdit: () => set({ editingTodoId: null }),
  checkInDate: null,
  startCheckIn: (moodDate) => set({ checkInDate: moodDate }),
  closeCheckIn: () => set({ checkInDate: null }),
}));