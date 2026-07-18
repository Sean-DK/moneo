import { describe, it, expect } from 'vitest';
import type { TimeEntry } from '../../lib/db/types';
import { resolveBackdateCascade } from './backdateCascade';

const now = new Date(2026, 6, 15, 15, 0); // 3:00 PM
const base = { id: '', createdAt: '', modifiedAt: '', isDeleted: false,
  categoryId: 'c', source: 0, editCount: 0, stoppedBy: null } as const;

function entry(id: string, startMinAgo: number, endMinAgo: number | null): TimeEntry {
  return {
    ...base, id, name: id,
    startedAt: new Date(now.getTime() - startMinAgo * 60_000).toISOString(),
    endedAt: endMinAgo === null ? null : new Date(now.getTime() - endMinAgo * 60_000).toISOString(),
  };
}

describe('resolveBackdateCascade', () => {
  it('shortens a previous entry the backdate lands inside (rule 1)', () => {
    // Prev entry ran 40 min ago until now; backdate new start 20 min ago.
    const prev = entry('Email', 40, 0);
    const plan = resolveBackdateCascade([prev], new Date(now.getTime() - 20 * 60_000), now);
    expect(plan.destructive).toBe(false);
    expect(plan.toDelete).toHaveLength(0);
    expect(plan.toShorten?.entry.id).toBe('Email');
    // shortened to end 20 min ago
    expect(plan.toShorten?.newEndedAt).toBe(new Date(now.getTime() - 20 * 60_000).toISOString());
  });

  it('does nothing when the backdate lands in a gap (rule: untouched)', () => {
    // Email ended 30 min ago; backdate only 20 min → lands in the untracked gap.
    const prev = entry('Email', 50, 30);
    const plan = resolveBackdateCascade([prev], new Date(now.getTime() - 20 * 60_000), now);
    expect(plan.destructive).toBe(false);
    expect(plan.toShorten).toBeNull();
    expect(plan.toDelete).toHaveLength(0);
  });

  it('swallows a shorter previous entry entirely (rule 2, destructive)', () => {
    // Break ran from 5 min ago to now; backdate 20 min reaches past it entirely.
    const swallowed = entry('Break', 5, 0);
    const plan = resolveBackdateCascade([swallowed], new Date(now.getTime() - 20 * 60_000), now);
    expect(plan.destructive).toBe(true);
    expect(plan.toDelete.map((e) => e.id)).toEqual(['Break']);
  });

  it('swallows multiple and shortens the one it lands inside', () => {
    // Lunch: 60→25 min ago. Break: 25→10 min ago. Scroll: 10 min ago→now.
    // Backdate 40 min: swallows Break+Scroll, lands inside Lunch → shorten Lunch.
    const lunch = entry('Lunch', 60, 25);
    const brk = entry('Break', 25, 10);
    const scroll = entry('Scroll', 10, 0);
    const plan = resolveBackdateCascade([lunch, brk, scroll], new Date(now.getTime() - 40 * 60_000), now);
    expect(plan.toDelete.map((e) => e.id).sort()).toEqual(['Break', 'Scroll']);
    expect(plan.toShorten?.entry.id).toBe('Lunch');
  });

  it('treats a running entry as ending now', () => {
    const running = entry('Focus', 30, null); // started 30 min ago, still going
    const plan = resolveBackdateCascade([running], new Date(now.getTime() - 20 * 60_000), now);
    expect(plan.toShorten?.entry.id).toBe('Focus');
  });

  it('Now (no backdate) touches nothing', () => {
    const running = entry('Focus', 30, null);
    const plan = resolveBackdateCascade([running], now, now);
    expect(plan.destructive).toBe(false);
    expect(plan.toShorten).toBeNull();
    expect(plan.toDelete).toHaveLength(0);
  });
});