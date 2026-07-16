import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { startSyncScheduler } from './lib/sync/scheduler.ts'
import './index.css'
import App from './App.tsx'
import { catchUpFiredReminders, startNotificationListeners } from './lib/notifications/listeners.ts'
import { initReminderNotifications } from './lib/notifications/reminderNotifications.ts'

startSyncScheduler();
startNotificationListeners();
void initReminderNotifications();
void catchUpFiredReminders();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void catchUpFiredReminders();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
