import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useNav } from './navStore';

/**
 * Central hardware-back handler. Priority: close an open sub-screen first,
 * then fall back to exiting the app at the top level.
 */
export function useAndroidBack(): void {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handle = App.addListener('backButton', () => {
      const nav = useNav.getState();

      // 1. Editing a todo → close the editor, stay on the Todos tab.
      if (nav.editingTodoId) {
        nav.closeEdit();
        return;
      }

      // 2. On any non-primary tab → go back to Reminders (the home tab).
      if (nav.tab !== 'reminders') {
        nav.go('reminders');
        return;
      }

      // 3. Top level → let the OS minimize/exit.
      void App.exitApp();
    });

    return () => { void handle.then((h) => h.remove()); };
  }, []);
}