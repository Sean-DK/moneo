import type { UserSettings } from '../../lib/db/types';

export const SLOTS = ['firstThing', 'morning', 'midday', 'afternoon', 'evening', 'beforeBed'] as const;
export type Slot = (typeof SLOTS)[number];

export const SLOT_LABELS: Record<Slot, string> = {
  firstThing: 'First thing',
  morning: 'Morning',
  midday: 'Midday',
  afternoon: 'Afternoon',
  evening: 'Evening',
  beforeBed: 'Before bed',
};

export const DAY_CHIPS = ['today', 'tomorrow', 'weekend', 'nextWeek', 'later', 'custom'] as const;
export type DayChip = (typeof DAY_CHIPS)[number];

export const DAY_LABELS: Record<DayChip, string> = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  weekend: 'This Weekend',
  nextWeek: 'Next Week',
  later: 'Later',
  custom: 'Custom',
};

export const RELATIVE_CHIPS = [15, 30, 60, 120, 240, 480] as const; // minutes
export type RelativeMinutes = (typeof RELATIVE_CHIPS)[number];

export function relativeLabel(minutes: RelativeMinutes): string {
  return minutes < 60 ? `${minutes} min` : `${minutes / 60} hr${minutes > 60 ? 's' : ''}`;
}

export function slotMinutes(settings: UserSettings, slot: Slot): number {
  switch (slot) {
    case 'firstThing': return settings.firstThingTime;
    case 'morning': return settings.morningTime;
    case 'midday': return settings.middayTime;
    case 'afternoon': return settings.afternoonTime;
    case 'evening': return settings.eveningTime;
    case 'beforeBed': return settings.beforeBedTime;
  }
}

/** The calendar day (local) a day-chip refers to, as year/month/day parts. */
export function resolveDay(chip: Exclude<DayChip, 'later' | 'custom'>, now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // local midnight
  switch (chip) {
    case 'today':
      return d;
    case 'tomorrow':
      d.setDate(d.getDate() + 1);
      return d;
    case 'weekend': {
      // Next Saturday; if today IS Saturday, today counts (slots filter the past)
      const daysUntilSat = (6 - d.getDay() + 7) % 7;
      d.setDate(d.getDate() + daysUntilSat);
      return d;
    }
    case 'nextWeek': {
      // Next Monday, always at least one day ahead
      const daysUntilMon = ((1 - d.getDay() + 7) % 7) || 7;
      d.setDate(d.getDate() + daysUntilMon);
      return d;
    }
  }
}

/** Combine a calendar day + slot into a concrete instant (local wall clock → Date). */
export function resolveSlotOnDay(day: Date, settings: UserSettings, slot: Slot): Date {
  const mins = slotMinutes(settings, slot);
  // Constructing via components lets the JS engine handle DST: if 2:30 AM
  // doesn't exist on a spring-forward day, the result normalizes forward.
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(mins / 60), mins % 60);
}

/** "In 90 minutes" → concrete instant, rounded up to the next 5-minute mark. */
export function resolveRelative(minutes: number, now: Date): Date {
  const t = new Date(now.getTime() + minutes * 60_000);
  const ms5 = 5 * 60_000;
  return new Date(Math.ceil(t.getTime() / ms5) * ms5);
}

const MIN_LEAD_MS = 10 * 60_000; // slots less than 10 min away are "past"

/** Slots still selectable for a given day (filters past + too-soon for today). */
export function availableSlots(day: Date, settings: UserSettings, now: Date): Slot[] {
  return SLOTS.filter((slot) => {
    const at = resolveSlotOnDay(day, settings, slot);
    return at.getTime() - now.getTime() >= MIN_LEAD_MS;
  });
}

/** Day chips currently selectable (today greys out when all its slots are past). */
export function availableDayChips(settings: UserSettings, now: Date): DayChip[] {
  return DAY_CHIPS.filter((chip) => {
    if (chip === 'later' || chip === 'custom') return true;
    return availableSlots(resolveDay(chip, now), settings, now).length > 0;
  });
}

export interface SmartSuggestion {
  label: string;        // "This evening"
  presetUsed: string;   // "smart.today.evening" — the analytics breadcrumb
  at: Date;
}

/** The one-tap row: "In 1 hour" + the next upcoming slot. */
export function smartSuggestions(settings: UserSettings, now: Date): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = [
    { label: 'In 1 hour', presetUsed: 'smart.relative.60', at: resolveRelative(60, now) },
  ];

  const todaySlots = availableSlots(resolveDay('today', now), settings, now);
  if (todaySlots.length > 0) {
    const slot = todaySlots[0];
    suggestions.push({
      label: `This ${SLOT_LABELS[slot].toLowerCase()}`,
      presetUsed: `smart.today.${slot}`,
      at: resolveSlotOnDay(resolveDay('today', now), settings, slot),
    });
  } else {
    const slot = SLOTS[0]; // tomorrow's first slot
    suggestions.push({
      label: `Tomorrow, ${SLOT_LABELS[slot].toLowerCase()}`,
      presetUsed: `smart.tomorrow.${slot}`,
      at: resolveSlotOnDay(resolveDay('tomorrow', now), settings, slot),
    });
  }

  return suggestions;
}