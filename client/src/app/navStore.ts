import { create } from 'zustand';

export type Tab = 'reminders' | 'todos' | 'time' | 'mood' | 'settings';

// navStore.ts
interface NavState {
  tab: Tab;
  editingTodoId: string | null;
  go: (tab: Tab) => void;
  editTodo: (id: string) => void;
  closeEdit: () => void;
}
export const useNav = create<NavState>((set) => ({
  tab: 'reminders',
  editingTodoId: null,
  go: (tab) => set({ tab, editingTodoId: null }),
  editTodo: (id) => set({ editingTodoId: id }),
  closeEdit: () => set({ editingTodoId: null }),
}));