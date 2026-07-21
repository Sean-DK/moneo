import { ChevronRight } from 'lucide-react';
import { useSettings } from './queries';
import { setSlotTime, setStrictness } from './actions';
import { TrackerStrictness } from '../../lib/db/types';
import { SLOT_LABELS, type Slot } from '../reminders/timeResolution';
import { SLOT_ICONS } from '../../lib/design/slotIcons';
import { SectionLabel } from '../../components/SectionLabel';
import { IconBox } from '../../components/IconBox';
import { useAuth } from '../../lib/auth/authStore';
import { useState } from 'react';

const STRICTNESS_OPTIONS: { value: TrackerStrictness; label: string; desc: string }[] = [
  { value: TrackerStrictness.LeaveMeAlone, label: 'Leave Me Alone', desc: 'No reminders to track, ever.' },
  { value: TrackerStrictness.Lenient, label: 'Lenient', desc: 'Nudges during long timers; up to 2 idle nudges a day.' },
  { value: TrackerStrictness.Firm, label: 'Firm', desc: 'More frequent; up to 4 idle nudges a day.' },
  { value: TrackerStrictness.Strict, label: 'Strict', desc: 'Hourly idle nudges, no daily limit.' },
  { value: TrackerStrictness.Draconian, label: 'Draconian', desc: 'Nudges the moment you stop tracking. Relentless.' },
];

const SLOTS: { field:
  'firstThingTime' | 'morningTime' | 'middayTime' | 'afternoonTime' | 'eveningTime' | 'beforeBedTime';
  slot: Slot }[] = [
  { field: 'firstThingTime', slot: 'firstThing' },
  { field: 'morningTime', slot: 'morning' },
  { field: 'middayTime', slot: 'midday' },
  { field: 'afternoonTime', slot: 'afternoon' },
  { field: 'eveningTime', slot: 'evening' },
  { field: 'beforeBedTime', slot: 'beforeBed' },
];

// minutes-from-midnight <-> "HH:MM" for <input type="time">
const toTimeStr = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const fromTimeStr = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const formatMinutes = (m: number) => timeFmt.format(new Date(0, 0, 0, Math.floor(m / 60), m % 60));

export function SettingsScreen() {
  const settings = useSettings();
  if (!settings) return <p className="text-muted">Loading…</p>;

  return (
    <div className="flex flex-col gap-5.5">
      <div className="flex flex-row justify-between">
        <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Settings</h1>
        <span className="text-[12px] text-muted" style={{ alignContent: 'end' }}>v{import.meta.env.VITE_APP_VERSION}</span>
      </div>

      <section>
        <SectionLabel>Time of day</SectionLabel>
        <div className="overflow-hidden rounded-15 border border-white/9 bg-surface">
          {SLOTS.map((s, i) => (
            <div key={s.field} className={`relative flex items-center gap-3 px-3.75 py-3.25 ${i < SLOTS.length - 1 ? 'border-b border-white/6' : ''}`}>
              <IconBox icon={SLOT_ICONS[s.slot]} size={30} />
              <span className="flex-1 text-[14px] font-medium text-ink">{SLOT_LABELS[s.slot]}</span>
              <span className="font-mono text-[14px] text-ink-muted">{formatMinutes(settings[s.field])}</span>
              <ChevronRight size={16} className="text-control" />
              <input
                id={s.field}
                type="time"
                value={toTimeStr(settings[s.field])}
                onChange={(e) => void setSlotTime(settings.id, s.field, fromTimeStr(e.target.value))}
                style={{ colorScheme: 'dark' }}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel>Nag strictness</SectionLabel>
        <div className="flex flex-col gap-2">
          {STRICTNESS_OPTIONS.map((o) => {
            const active = settings.trackerStrictness === o.value;
            return (
              <button
                key={o.value}
                onClick={() => void setStrictness(settings.id, o.value)}
                className={`flex items-start gap-3 rounded-13 border px-3.5 py-3.25 text-left ${
                  active ? 'border-accent bg-accent/9' : 'border-white/8 bg-surface'
                }`}
              >
                <span
                  className={`mt-0.5 h-5 w-5 shrink-0 rounded-full ${active ? 'border-[6px] border-accent' : 'border-2 border-control'}`}
                />
                <span>
                  <div className={`text-[14px] ${active ? 'font-bold text-ink' : 'font-semibold text-ink'}`}>{o.label}</div>
                  <div className={`text-[12px] ${active ? 'text-[#A9D9D3]' : 'text-[#8A8D88]'}`}>{o.desc}</div>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <div className="border-t border-white/8">
          <SignOutRow />
        </div>
      </section>
    </div>
  );
}

function SignOutRow() {
  const { prepareSignOut, signOut, email } = useAuth();
  const [pending, setPending] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);

  const start = async () => {
    setChecking(true);
    const remaining = await prepareSignOut();
    setChecking(false);
    if (remaining === 0) {
      await signOut();                 // clean — nothing to lose
    } else {
      setPending(remaining);           // warn first
    }
  };

  return (
    <>
      <div className="flex items-center justify-between py-3">
        <div>
          <div className="text-[15px] text-ink">Signed in</div>
          <div className="text-[13px] text-muted">{email}</div>
        </div>
        <button
          onClick={() => void start()}
          disabled={checking}
          className="rounded-14 border border-danger/40 px-4 py-2 text-[14px] font-semibold text-danger disabled:opacity-50"
        >
          {checking ? 'Syncing…' : 'Sign out'}
        </button>
      </div>

      {pending !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-sm rounded-2xl bg-base p-5">
            <p className="text-[16px] font-semibold text-ink">
              You have {pending} unsynced {pending === 1 ? 'item' : 'items'}
            </p>
            <p className="mt-2 text-[14px] text-muted">
              They couldn&rsquo;t be saved to the server. If you sign out now, they&rsquo;ll be lost forever.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setPending(null)}
                className="flex-1 rounded-14 border border-white/15 py-2.5 font-semibold text-ink"
              >
                Cancel
              </button>
              <button
                onClick={() => void signOut()}
                className="flex-1 rounded-14 border border-danger/40 bg-danger/10 py-2.5 font-bold text-danger"
              >
                Sign out anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}