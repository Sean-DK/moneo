import { describe, it, expect } from 'vitest';
import type { UserSettings } from '../../lib/db/types';
import { isQuietAt, nagDayStart, nextAwakeInstant } from './quietHours';

const settings: UserSettings = {
  id: 's1', createdAt: '', modifiedAt: '', isDeleted: false,
  firstThingTime: 300,   // 05:00
  morningTime: 540, middayTime: 720, afternoonTime: 900, eveningTime: 1080,
  beforeBedTime: 1320,   // 22:00
  trackerStrictness: 1,
};

describe('isQuietAt', () => {
  it('is quiet late at night (after bedtime)', () => {
    expect(isQuietAt(settings, new Date(2026, 6, 15, 23, 0))).toBe(true);
  });
  it('is quiet in the small hours (before wake)', () => {
    expect(isQuietAt(settings, new Date(2026, 6, 15, 3, 0))).toBe(true);
  });
  it('is awake midday', () => {
    expect(isQuietAt(settings, new Date(2026, 6, 15, 14, 0))).toBe(false);
  });
  it('boundary: exactly bedtime is quiet, exactly wake is awake', () => {
    expect(isQuietAt(settings, new Date(2026, 6, 15, 22, 0))).toBe(true);
    expect(isQuietAt(settings, new Date(2026, 6, 15, 5, 0))).toBe(false);
  });
});

describe('nagDayStart', () => {
  it('afternoon → this morning 5am', () => {
    const d = nagDayStart(settings, new Date(2026, 6, 15, 14, 0));
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(5);
  });
  it('2am → yesterday 5am', () => {
    const d = nagDayStart(settings, new Date(2026, 6, 15, 2, 0));
    expect(d.getDate()).toBe(14);
    expect(d.getHours()).toBe(5);
  });
});

describe('nextAwakeInstant', () => {
  it('leaves an awake instant unchanged', () => {
    const at = new Date(2026, 6, 15, 14, 0);
    expect(nextAwakeInstant(settings, at).getTime()).toBe(at.getTime());
  });
  it('pushes a 3am instant to 5am same day', () => {
    const d = nextAwakeInstant(settings, new Date(2026, 6, 15, 3, 0));
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(5);
  });
  it('pushes an 11pm instant to 5am next day', () => {
    const d = nextAwakeInstant(settings, new Date(2026, 6, 15, 23, 0));
    expect(d.getDate()).toBe(16);
    expect(d.getHours()).toBe(5);
  });
});