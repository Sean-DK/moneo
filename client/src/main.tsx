import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { startSyncScheduler } from './lib/sync/scheduler.ts'
import './index.css'
import App from './App.tsx'
import { catchUpFiredReminders, startNotificationListeners } from './lib/notifications/listeners.ts'
import { initReminderNotifications } from './lib/notifications/reminderNotifications.ts'
import { initMoodNotifications, reconcileMoodNotifications } from './features/mood/moodNotifications.tsx'
import { reconcileNags } from './features/tracking/nagScheduler.ts'

startSyncScheduler();
startNotificationListeners();
void initReminderNotifications();
void catchUpFiredReminders();
void initMoodNotifications();
void reconcileMoodNotifications();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    void catchUpFiredReminders();
    void reconcileNags();
    void reconcileMoodNotifications(); 
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
