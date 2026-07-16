import { describe, it, expect } from 'vitest';
import type { UserSettings } from '../../lib/db/types';
import {
  resolveDay, resolveSlotOnDay, resolveRelative,
  availableSlots, availableDayChips, smartSuggestions,
} from './timeResolution';

const settings: UserSettings = {
  id: 's1', createdAt: '', modifiedAt: '', isDeleted: false,
  firstThingTime: 300,   // 5:00
  morningTime: 540,      // 9:00
  middayTime: 720,       // 12:00
  afternoonTime: 900,    // 15:00
  eveningTime: 1080,     // 18:00
  beforeBedTime: 1320,   // 22:00
  trackerStrictness: 1,
};

// Wed 2026-07-15, 14:00 local
const wedAfternoon = new Date(2026, 6, 15, 14, 0);

describe('resolveDay', () => {
  it('weekend → next Saturday', () => {
    expect(resolveDay('weekend', wedAfternoon).getDay()).toBe(6);
    expect(resolveDay('weekend', wedAfternoon).getDate()).toBe(18);
  });

  it('weekend on a Saturday → same day', () => {
    const sat = new Date(2026, 6, 18, 10, 0);
    expect(resolveDay('weekend', sat).getDate()).toBe(18);
  });

  it('nextWeek on a Monday → the following Monday, never today', () => {
    const mon = new Date(2026, 6, 13, 10, 0);
    expect(resolveDay('nextWeek', mon).getDate()).toBe(20);
  });
});

describe('availableSlots', () => {
  it('filters past slots for today', () => {
    // 14:00: firstThing/morning/midday are past; afternoon (15:00) onward remain
    expect(availableSlots(resolveDay('today', wedAfternoon), settings, wedAfternoon))
      .toEqual(['afternoon', 'evening', 'beforeBed']);
  });

  it('excludes a slot less than 10 minutes away', () => {
    const at1455 = new Date(2026, 6, 15, 14, 55);
    expect(availableSlots(resolveDay('today', at1455), settings, at1455))
      .toEqual(['evening', 'beforeBed']);
  });

  it('returns all slots for tomorrow', () => {
    expect(availableSlots(resolveDay('tomorrow', wedAfternoon), settings, wedAfternoon))
      .toHaveLength(6);
  });
});

describe('availableDayChips', () => {
  it('drops today when every slot has passed', () => {
    const lateNight = new Date(2026, 6, 15, 23, 30);
    expect(availableDayChips(settings, lateNight)).not.toContain('today');
  });
});

describe('resolveRelative', () => {
  it('rounds up to the next 5-minute mark', () => {
    const at = resolveRelative(60, new Date(2026, 6, 15, 14, 3));
    expect(at.getHours()).toBe(15);
    expect(at.getMinutes()).toBe(5);
  });
});

describe('DST', () => {
  // US spring-forward: 2026-03-08, 2:00 AM → 3:00 AM (America/New_York etc.)
  // Only meaningful if the test machine's TZ observes it — which yours does.
  it('a slot inside the spring-forward gap normalizes instead of exploding', () => {
    const dstSettings = { ...settings, firstThingTime: 150 }; // 2:30 AM — nonexistent that day
    const day = new Date(2026, 2, 8);
    const at = resolveSlotOnDay(day, dstSettings, 'firstThing');
    expect(at.getDate()).toBe(8);          // still the right day
    expect(at.getHours()).toBeGreaterThanOrEqual(2); // normalized forward, not backward
  });
});

describe('smartSuggestions', () => {
  it('offers next upcoming slot when today has slots left', () => {
    const s = smartSuggestions(settings, wedAfternoon);
    expect(s[1].label).toBe('This afternoon');
    expect(s[1].presetUsed).toBe('smart.today.afternoon');
  });

  it('falls over to tomorrow firstThing late at night', () => {
    const lateNight = new Date(2026, 6, 15, 23, 30);
    expect(smartSuggestions(settings, lateNight)[1].presetUsed).toBe('smart.tomorrow.firstThing');
  });
});