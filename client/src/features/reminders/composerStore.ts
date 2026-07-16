import { create } from 'zustand';
import { Priority } from '../../lib/db/types';

interface ComposerDefaults {
  priority: Priority;
  categoryId: string | null;
  remember: (d: { priority: Priority; categoryId: string | null }) => void;
}

export const useComposerDefaults = create<ComposerDefaults>((set) => ({
  priority: Priority.None,
  categoryId: null,
  remember: (d) => set(d),
}));