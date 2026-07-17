import { useEffect, useState } from 'react';
import { Calendar, Clock, Zap } from 'lucide-react';
import {
  DAY_LABELS, SLOT_LABELS, RELATIVE_CHIPS, relativeLabel,
  availableSlots, resolveDay, resolveSlotOnDay, resolveRelative,
  smartSuggestions, dayChipAvailability, DAY_CHIPS,
  type DayChip, type Slot,
} from './timeResolution';
import { SLOT_ICONS } from '../../lib/design/slotIcons';
import { SectionLabel } from '../../components/SectionLabel';
import { Chip } from '../../components/Chip';
import { IconBox } from '../../components/IconBox';
import type { UserSettings } from '../../lib/db/types';

const fmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'short', hour: 'numeric', minute: '2-digit',
});

export function ReminderTimePicker({
  settings,
  now,
  enabled = true,
  showSmartSuggestions = true,
  onPick,
}: {
  settings: UserSettings;
  now: Date;
  enabled?: boolean;
  showSmartSuggestions?: boolean;
  onPick: (at: Date, presetUsed: string) => void;
}) {
  const [day, setDay] = useState<DayChip | null>(null);
  const [customAt, setCustomAt] = useState('');

  // Clear a selected day that just became unavailable (e.g. last slot passed).
  useEffect(() => {
    if (day && day !== 'later' && day !== 'custom') {
      if (!dayChipAvailability(settings, now)[day]) setDay(null);
    }
  }, [now, day, settings]);

  const disabled = !enabled;

  return (
    <>
      {showSmartSuggestions && (
        <div>
          <SectionLabel commented>quick pick</SectionLabel>
          <div className="grid grid-cols-3 gap-2">
            {smartSuggestions(settings, now).map((s) => (
              <button
                key={s.presetUsed}
                disabled={disabled}
                onClick={() => onPick(s.at, s.presetUsed)}
                className="flex flex-col items-center gap-0.5 rounded-13 border border-accent/40 bg-accent/10 px-1.5 py-2.5 text-center disabled:opacity-40"
              >
                <span className="flex items-center gap-1 text-[12.5px] font-bold text-accent">
                  <Zap size={12} />
                  {s.label}
                </span>
                <span className="font-mono text-[11px] text-[#8FDAD3]">{fmt.format(s.at)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionLabel>When</SectionLabel>
        <div className="mb-2.5 grid grid-cols-3 gap-2">
          {(() => {
            const avail = dayChipAvailability(settings, now);
            return DAY_CHIPS.map((chip) => (
              <Chip
                key={chip}
                selected={day === chip}
                disabled={!avail[chip] || disabled}
                onClick={() => setDay(chip)}
                variant="accent"
                dot={false}
              >
                {chip === 'custom' && <Calendar size={13} />}
                {DAY_LABELS[chip]}
              </Chip>
            ));
          })()}
        </div>

        {day && day !== 'later' && day !== 'custom' && (
          <div className="grid grid-cols-2 gap-2">
            {availableSlots(resolveDay(day, now), settings, now).map((slot: Slot) => {
              const at = resolveSlotOnDay(resolveDay(day, now), settings, slot);
              return (
                <button
                  key={slot}
                  disabled={disabled}
                  onClick={() => onPick(at, `${day}.${slot}`)}
                  className="flex items-center gap-2.5 rounded-14 border border-white/10 bg-surface px-2.75 py-2.5 text-left disabled:opacity-40"
                >
                  <IconBox icon={SLOT_ICONS[slot]} />
                  <span className="flex flex-col">
                    <span className="text-[13px] font-semibold text-ink">{SLOT_LABELS[slot]}</span>
                    <span className="font-mono text-[11.5px] text-muted">{fmt.format(at)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {day === 'later' && (
          <div className="grid grid-cols-2 gap-2">
            {RELATIVE_CHIPS.map((m) => {
              const at = resolveRelative(m, now);
              return (
                <button
                  key={m}
                  disabled={disabled}
                  onClick={() => onPick(at, `later.${m}`)}
                  className="flex items-center gap-2.5 rounded-14 border border-white/10 bg-surface px-2.75 py-2.5 text-left disabled:opacity-40"
                >
                  <IconBox icon={Clock} />
                  <span className="flex flex-col">
                    <span className="text-[13px] font-semibold text-ink">{relativeLabel(m)}</span>
                    <span className="font-mono text-[11.5px] text-muted">{fmt.format(at)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {day === 'custom' && (
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={customAt}
              onChange={(e) => setCustomAt(e.target.value)}
              style={{ colorScheme: 'dark' }}
              className="flex-1 rounded-14 border border-white/10 bg-surface px-3 py-2.5 text-[14px] text-ink outline-none"
            />
            <button
              disabled={disabled || !customAt}
              onClick={() => onPick(new Date(customAt), 'custom')}
              className="shrink-0 rounded-14 bg-accent px-4 text-[14px] font-bold text-ink-on-accent disabled:opacity-40"
            >
              Set
            </button>
          </div>
        )}
      </div>
    </>
  );
}