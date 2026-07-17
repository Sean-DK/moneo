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

export const DAY_CHIPS = ['later', 'today', 'tomorrow', 'weekend', 'nextWeek', 'custom'] as const;
export type DayChip = (typeof DAY_CHIPS)[number];

export const DAY_LABELS: Record<DayChip, string> = {
  later: 'Later',
  today: 'Today',
  tomorrow: 'Tomorrow',
  weekend: 'This Weekend',
  nextWeek: 'Next Week',
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
export function dayChipAvailability(settings: UserSettings, now: Date): Record<DayChip, boolean> {
  return Object.fromEntries(
    DAY_CHIPS.map((chip) => {
      if (chip === 'later' || chip === 'custom') return [chip, true];
      return [chip, availableSlots(resolveDay(chip, now), settings, now).length > 0];
    }),
  ) as Record<DayChip, boolean>;
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
  const tomorrow = resolveDay('tomorrow', now);

  if (todaySlots.length > 0) {
    // Next upcoming slot today
    const slot = todaySlots[0];
    const label = SLOT_LABELS[slot].toLowerCase() === 'morning' ? 'This morning'
      : SLOT_LABELS[slot].toLowerCase() === 'midday' ? 'Midday today'
      : SLOT_LABELS[slot].toLowerCase() === 'afternoon' ? 'This afternoon'
      : SLOT_LABELS[slot].toLowerCase() === 'evening' ? 'This evening'
      : SLOT_LABELS[slot].toLowerCase() === 'before bed' ? 'Tonight'
      : 'unknown'
    suggestions.push({
      label: label,
      presetUsed: `smart.today.${slot}`,
      at: resolveSlotOnDay(resolveDay('today', now), settings, slot),
    });

    // Tomorrow's first slot — always distinct from a "today" suggestion
    const tSlot = SLOTS[1];
    suggestions.push({
      label: `Tomorrow`,
      presetUsed: `smart.tomorrow.${tSlot}`,
      at: resolveSlotOnDay(tomorrow, settings, tSlot),
    });
  } else {
    // No today-slots left (late evening): offer the first TWO tomorrow slots
    const [first, second] = [SLOTS[1], SLOTS[2]];
    suggestions.push({
      label: `Tomorrow`,
      presetUsed: `smart.tomorrow.${first}`,
      at: resolveSlotOnDay(tomorrow, settings, first),
    });
    suggestions.push({
      label: `Tomorrow`,
      presetUsed: `smart.tomorrow.${second}`,
      at: resolveSlotOnDay(tomorrow, settings, second),
    });
  }

  return suggestions;
}