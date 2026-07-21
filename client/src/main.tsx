import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { startSyncScheduler } from './lib/sync/scheduler.ts'
import './index.css'
import App from './App.tsx'
import { catchUpFiredReminders, startNotificationListeners } from './lib/notifications/listeners.ts'
import { initReminderNotifications } from './lib/notifications/reminderNotifications.ts'
import { initMoodNotifications, reconcileMoodNotifications } from './features/mood/moodNotifications.tsx'
import { initNagNotifications, reconcileNags } from './features/tracking/nagScheduler.ts'
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in'

void GoogleSignIn.initialize({
  clientId: '665106346284-g6scnm9vid4umh97690ehrksaae73sgq.apps.googleusercontent.com',
  scopes: ['https://www.googleapis.com/auth/userinfo.profile'],
});

startSyncScheduler();
startNotificationListeners();

void (async () => {
  await initReminderNotifications();
  await initNagNotifications();
  await initMoodNotifications();

  // Only after channels exist:
  await catchUpFiredReminders();
  await reconcileMoodNotifications();
  await reconcileNags();
})();

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
