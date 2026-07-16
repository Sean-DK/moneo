import { create } from 'zustand';

export type Tab = 'reminders' | 'todos' | 'tracking' | 'settings';

interface NavState {
  tab: Tab;
  go: (tab: Tab) => void;
}

export const useNav = create<NavState>((set) => ({
  tab: 'reminders',
  go: (tab) => set({ tab }),
}));