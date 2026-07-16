import { useSettings } from './queries';
import { setSlotTime, setStrictness } from './actions';
import { TrackerStrictness } from '../../lib/db/types';

const STRICTNESS_OPTIONS: { value: TrackerStrictness; label: string; desc: string }[] = [
  { value: TrackerStrictness.LeaveMeAlone, label: 'Leave Me Alone', desc: 'No reminders to track, ever.' },
  { value: TrackerStrictness.Lenient, label: 'Lenient', desc: 'Nudges during long timers; up to 2 idle nudges a day.' },
  { value: TrackerStrictness.Firm, label: 'Firm', desc: 'More frequent; up to 4 idle nudges a day.' },
  { value: TrackerStrictness.Strict, label: 'Strict', desc: 'Hourly idle nudges, no daily limit.' },
  { value: TrackerStrictness.Draconian, label: 'Draconian', desc: 'Nudges the moment you stop tracking. Relentless.' },
];

const SLOTS: { field:
  'firstThingTime' | 'morningTime' | 'middayTime' | 'afternoonTime' | 'eveningTime' | 'beforeBedTime';
  label: string }[] = [
  { field: 'firstThingTime', label: 'First thing' },
  { field: 'morningTime', label: 'Morning' },
  { field: 'middayTime', label: 'Midday' },
  { field: 'afternoonTime', label: 'Afternoon' },
  { field: 'eveningTime', label: 'Evening' },
  { field: 'beforeBedTime', label: 'Before bed' },
];

// minutes-from-midnight <-> "HH:MM" for <input type="time">
const toTimeStr = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const fromTimeStr = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };

export function SettingsScreen() {
  const settings = useSettings();
  if (!settings) return <p style={{ padding: 16 }}>Loading…</p>;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
      <h2>Settings</h2>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 15, color: '#666' }}>Time reminder times</h3>
        <p style={{ fontSize: 13, color: '#999', marginTop: 0 }}>
          Used for reminder presets. "Before bed" and "First thing" also set your quiet hours.
        </p>
        {SLOTS.map((s) => (
          <div key={s.field} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
            <label htmlFor={s.field}>{s.label}</label>
            <input
              id={s.field}
              type="time"
              value={toTimeStr(settings[s.field])}
              onChange={(e) => void setSlotTime(settings.id, s.field, fromTimeStr(e.target.value))}
            />
          </div>
        ))}
      </section>

      <section>
        <h3 style={{ fontSize: 15, color: '#666' }}>Time-tracking reminders</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {STRICTNESS_OPTIONS.map((o) => {
            const active = settings.trackerStrictness === o.value;
            return (
              <button
                key={o.value}
                onClick={() => void setStrictness(settings.id, o.value)}
                style={{
                  textAlign: 'left', padding: 12, borderRadius: 8, cursor: 'pointer',
                  border: active ? '2px solid #3B82F6' : '1px solid #ddd',
                  background: active ? '#EFF6FF' : 'white',
                }}
              >
                <div style={{ fontWeight: 600 }}>{o.label}</div>
                <div style={{ fontSize: 13, color: '#666' }}>{o.desc}</div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}