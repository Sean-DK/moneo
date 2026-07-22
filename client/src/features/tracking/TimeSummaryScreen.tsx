import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '../../lib/db/db';
import { useCategories } from '../categories/queries';
import { useSettings } from '../settings/queries';
import { useNav } from '../../app/navStore';
import {
  categorySlices, computeCoverage, fmtDuration, isCurrentPeriod,
  periodLabel, periodRange, shiftAnchor, totalSubLabel, type SummaryPeriod,
} from './summary';

const PERIODS: { id: SummaryPeriod; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
];

export function TimeSummaryScreen() {
  const { closeTimeSummary } = useNav();
  const [period, setPeriod] = useState<SummaryPeriod>('day');
  const [anchor, setAnchor] = useState(() => new Date());

  const categories = useCategories();
  const settings = useSettings();
  const entries = useLiveQuery(() => db.timeEntries.filter((e) => !e.isDeleted).toArray());

  const selectPeriod = (p: SummaryPeriod) => {
    setPeriod(p);
    setAnchor(new Date());   // switching tabs resets to the current period
  };

  if (!categories || !entries) return <p className="text-muted">Loading…</p>;

  const now = new Date();
  const range = periodRange(period, anchor);
  const current = isCurrentPeriod(period, anchor, now);
  const { slices, totalMinutes } = categorySlices(entries, categories, range, now);
  const coverage = computeCoverage(period, totalMinutes, range, entries, settings);

  return (
    <div className="flex flex-col pb-6">
      <button onClick={closeTimeSummary} aria-label="Back" className="mb-2 flex items-center gap-1 self-start p-1 text-muted">
        <ChevronLeft size={20} />
        <span className="text-[14px] font-medium">Back</span>
      </button>

      {/* Header */}
      <div className="text-[13px] font-medium text-muted">Where your time went</div>

      <div className="mt-2.5 flex items-center gap-2.75">
        <button
          onClick={() => setAnchor(shiftAnchor(period, anchor, -1))}
          aria-label="Previous period"
          className="flex h-7.5 w-7.5 items-center justify-center rounded-9 border border-white/9 text-ink-muted"
        >
          <ChevronLeft size={16} strokeWidth={2} />
        </button>
        <div className="text-[16px] font-semibold tracking-[-0.01em] text-ink">
          {periodLabel(period, anchor, now)}
        </div>
        {!current && (
          <button
            onClick={() => setAnchor(shiftAnchor(period, anchor, 1))}
            aria-label="Next period"
            className="flex h-7.5 w-7.5 items-center justify-center rounded-9 border border-white/9 text-ink-muted"
          >
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        )}
      </div>

      <div className="mt-4 flex gap-1 rounded-14 border border-white/6 bg-[#111B19] p-1">
        {PERIODS.map((p) => {
          const active = p.id === period;
          return (
            <button
              key={p.id}
              onClick={() => selectPeriod(p.id)}
              className="flex-1 rounded-[11px] py-2.25 text-[13px] font-semibold transition-colors duration-150"
              style={{
                background: active ? 'var(--color-accent)' : 'transparent',
                color: active ? '#07110F' : '#9AA39C',
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Total + coverage */}
      <div className="mt-6.5">
        <div className="flex items-baseline gap-2.5">
          <div className="font-mono text-[42px] font-semibold tracking-[-0.02em] text-ink tabular-nums">
            {fmtDuration(totalMinutes)}
          </div>
          <div className="text-[13px] text-muted">{totalSubLabel(period, anchor)}</div>
        </div>

        <div className="mt-4">
          <div
            className="relative h-2 overflow-hidden rounded-[5px] border border-white/5"
            style={{ background: '#12211E' }}
          >
            <div
              className="absolute inset-0"
              style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,.05) 0 1px, transparent 1px 7px)' }}
            />
            <div
              className="relative h-full rounded-[5px]"
              style={{ width: `${coverage.fillPct}%`, background: 'linear-gradient(90deg, #3FD0C4, #2BA99E)' }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[11.5px]">
            <span className="text-ink-muted" style={{ color: '#9AA39C' }}>{coverage.leftLabel}</span>
            <span className="font-mono" style={{ color: '#5F6B64' }}>{coverage.rightLabel}</span>
          </div>
        </div>
      </div>

      {/* Where it went */}
      <div className="mt-7.5">
        <div className="mb-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: '#5F6B64' }}>
          Where it went
        </div>

        {slices.length === 0 ? (
          <p className="text-[13px] text-muted">Nothing tracked in this period yet.</p>
        ) : (
          <>
            <div className="flex h-4 gap-0.5 overflow-hidden rounded-md">
              {slices.map((s) => (
                <div key={s.id} title={s.name} style={{ width: s.widthPct, background: s.color, height: '100%' }} />
              ))}
            </div>

            <div className="mt-4 flex flex-col">
              {slices.map((s) => (
                <div key={s.id} className="flex items-center gap-2.75 border-b border-white/5 py-2.75">
                  <span className="h-2.25 w-2.25 shrink-0 rounded-full" style={{ background: s.color }} />
                  <span className="flex-1 text-[14px] font-medium" style={{ color: '#DFE3DD' }}>{s.name}</span>
                  <span className="font-mono text-[13px]" style={{ color: '#AEB5AC' }}>{s.durationLabel}</span>
                  <span className="w-8.5 text-right font-mono text-[12px]" style={{ color: '#5F6B64' }}>{s.percentLabel}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
