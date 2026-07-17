import { Sunrise, Coffee, Sun, Sunset, Moon, Bed, type LucideIcon } from 'lucide-react';
import type { Slot } from '../../features/reminders/timeResolution';

export const SLOT_ICONS: Record<Slot, LucideIcon> = {
  firstThing: Sunrise,
  morning: Coffee,
  midday: Sun,
  afternoon: Sunset,
  evening: Moon,
  beforeBed: Bed,
};
