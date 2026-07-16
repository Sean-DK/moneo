import { describe, it, expect } from 'vitest';
import type { UserSettings } from '../../lib/db/types';
import { inQuietHours, nagDayStart } from './nagWindow';

const settings: UserSettings = {
  id: 's1', createdAt: '', modifiedAt: '', isDeleted: false,
  firstThingTime: 300,   // 5:00
  morningTime: 540, middayTime: 720, afternoonTime: 900, eveningTime: 1080,
  beforeBedTime: 1320,   // 22:00
  trackerStrictness: 1,
};

describe('inQuietHours (22:00 → 05:00 wrapping window)', () => {
  it('is quiet late at night', () => {
    expect(inQuietHours(settings, new Date(2026, 6, 15, 23, 30))).toBe(true);
  });
  it('is quiet in the pre-dawn hours', () => {
    expect(inQuietHours(settings, new Date(2026, 6, 15, 3, 0))).toBe(true);
  });
  it('is not quiet during the day', () => {
    expect(inQuietHours(settings, new Date(2026, 6, 15, 14, 0))).toBe(false);
  });
  it('boundary: exactly bedtime is quiet, exactly wake is not', () => {
    expect(inQuietHours(settings, new Date(2026, 6, 15, 22, 0))).toBe(true);
    expect(inQuietHours(settings, new Date(2026, 6, 15, 5, 0))).toBe(false);
  });
});

describe('nagDayStart (resets at firstThingTime = 05:00)', () => {
  it('afternoon → 5am today', () => {
    const s = nagDayStart(settings, new Date(2026, 6, 15, 14, 0));
    expect(s.getDate()).toBe(15);
    expect(s.getHours()).toBe(5);
  });
  it('before 5am → 5am yesterday', () => {
    const s = nagDayStart(settings, new Date(2026, 6, 15, 3, 0));
    expect(s.getDate()).toBe(14);
    expect(s.getHours()).toBe(5);
  });
});