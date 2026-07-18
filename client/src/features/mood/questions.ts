import {
  DayRating, Productivity, Weather, Location, FreeTime, Social, Sleep,
  AteWell, Exercise, Sickness, StressEvent, GoodEvent, Outlook, Activities,
  type MoodEntry,
} from '../../lib/db/types';
import {
  Sun, Cloud, CloudRain, CloudSnow, CircleHelp,
  Home, Trees, Shuffle,
  Dumbbell, Footprints, Sofa,
  HeartPulse, Frown, Thermometer,
  Laugh, Meh,
  Briefcase, ListChecks, Palette, Users, Sparkles,
  type LucideIcon,
} from 'lucide-react';

// Which MoodEntry field a question writes to.
export type MoodField = keyof Omit<MoodEntry,
  keyof import('../../lib/db/types').Syncable | 'moodDate' | 'repeatDayAutoSkipped'>;

export interface Option {
  label: string;
  value: number;      // the encoded enum value (or flag bit for multi)
  icon?: LucideIcon;   // present → this question renders as a "category" (icon-led) list
  neutral?: boolean;   // "Don't know" etc. — excluded from the scale ramp, gets a dim dot
}

export interface Question {
  field: MoodField;
  prompt: string;
  group: 'Mood' | 'Activity' | 'Physical' | 'Emotional';
  kind: 'single' | 'multi';   // multi = the activities bitmask question
  options: Option[];
  info?: string;              // if set, shows a QuestionInfo (i) icon + pop-up
  autoInfoKey?: string;       // if set, auto-shows the pop-up once (meta flag)
}

// Options listed in DISPLAY order (best-to-worst top-to-bottom for scales).
export const QUESTIONS: Question[] = [
  // --- Mood ---
  { field: 'dayRating', group: 'Mood', kind: 'single', prompt: 'How was your day?',
    options: [
      { label: 'Fantastic', value: DayRating.Fantastic },
      { label: 'Good', value: DayRating.Good },
      { label: 'Okay', value: DayRating.Okay },
      { label: 'Challenging', value: DayRating.Challenging },
      { label: 'Awful', value: DayRating.Awful },
    ] },
  { field: 'productivity', group: 'Mood', kind: 'single', prompt: 'How productive were you today?',
    options: [
      { label: 'Crushed It', value: Productivity.CrushedIt },
      { label: 'Fairly', value: Productivity.Fairly },
      { label: 'Somewhat', value: Productivity.Somewhat },
      { label: 'Not Very', value: Productivity.NotVery },
      { label: 'Not At All', value: Productivity.NotAtAll },
    ] },

  // --- Activity ---
  { field: 'weather', group: 'Activity', kind: 'single', prompt: 'What was the weather like today?',
    options: [
      { label: 'Sunny', value: Weather.Sunny, icon: Sun },
      { label: 'Cloudy', value: Weather.Cloudy, icon: Cloud },
      { label: 'Rainy', value: Weather.Rainy, icon: CloudRain },
      { label: 'Snowy', value: Weather.Snowy, icon: CloudSnow },
      { label: "Don't know", value: Weather.DontKnow, icon: CircleHelp, neutral: true },
    ] },
  { field: 'activities', group: 'Activity', kind: 'multi',
    prompt: 'What did you spend most of the day doing?',
    info: 'Pick all that apply. Choose "Everything, and more" for days too hectic or scattered to break down — it supercedes the others.',
    autoInfoKey: 'mood.activities',
    options: [
      { label: 'Working', value: Activities.Working, icon: Briefcase },
      { label: 'Chores & Errands', value: Activities.ChoresErrands, icon: ListChecks },
      { label: 'Hobbies', value: Activities.Hobbies, icon: Palette },
      { label: 'Relaxing', value: Activities.Relaxing, icon: Sofa },
      { label: 'Socializing', value: Activities.Socializing, icon: Users },
      // "Everything, and more" (chaotic) handled specially in the component; icon: Sparkles.
    ] },
  { field: 'location', group: 'Activity', kind: 'single', prompt: 'Where did you spend most of your day?',
    options: [
      { label: 'Inside', value: Location.Inside, icon: Home },
      { label: 'Outside', value: Location.Outside, icon: Trees },
      { label: 'A bit of both', value: Location.Both, icon: Shuffle },
    ] },
  { field: 'freeTime', group: 'Activity', kind: 'single', prompt: 'How much free time did you have today?',
    options: [
      { label: 'More than enough', value: FreeTime.MoreThanEnough },
      { label: 'Enough', value: FreeTime.Enough },
      { label: 'Not enough', value: FreeTime.NotEnough },
      { label: 'None', value: FreeTime.None },
      { label: "Don't know", value: FreeTime.DontKnow, neutral: true },
    ] },
  { field: 'social', group: 'Activity', kind: 'single', prompt: 'How social were you today?',
    options: [
      { label: 'Very', value: Social.Very },
      { label: 'Somewhat', value: Social.Somewhat },
      { label: 'A little', value: Social.ALittle },
      { label: 'Not at all', value: Social.NotAtAll },
    ] },

  // --- Physical ---
  { field: 'sleep', group: 'Physical', kind: 'single', prompt: 'How well did you sleep last night?',
    options: [
      { label: 'Great', value: Sleep.Great },
      { label: 'Okay', value: Sleep.Okay },
      { label: 'Poorly', value: Sleep.Poorly },
      { label: "Don't know", value: Sleep.DontKnow, neutral: true },
    ] },
  { field: 'ateWell', group: 'Physical', kind: 'single', prompt: 'Did you eat well today?',
    options: [
      { label: 'Yes', value: AteWell.Yes },
      { label: 'I think so', value: AteWell.IThinkSo },
      { label: 'Not really', value: AteWell.NotReally },
      { label: 'No', value: AteWell.No },
      { label: "Don't know", value: AteWell.DontKnow, neutral: true },
    ] },
  { field: 'exercise', group: 'Physical', kind: 'single', prompt: 'Did you exercise today?',
    options: [
      { label: 'Yes', value: Exercise.Yes, icon: Dumbbell },
      { label: 'Yes, I tried to', value: Exercise.Tried, icon: Footprints },
      { label: 'No', value: Exercise.No, icon: Sofa },
    ] },
  { field: 'sickness', group: 'Physical', kind: 'single', prompt: 'Were you sick today?',
    options: [
      { label: 'No', value: Sickness.No, icon: HeartPulse },
      { label: 'A little off', value: Sickness.ALittleOff, icon: Frown },
      { label: 'Yes', value: Sickness.Yes, icon: Thermometer },
    ] },

  // --- Emotional ---
  { field: 'stressEvent', group: 'Emotional', kind: 'single', prompt: 'Did anything throw off your day today?',
    info: 'This asks about a single event that put a damper on your day — not whether the day was generally stressful.',
    autoInfoKey: 'mood.stressEvent',
    options: [
      { label: 'No', value: StressEvent.No },
      { label: 'Yes, a bit', value: StressEvent.YesABit },
      { label: 'Yes, badly', value: StressEvent.YesBadly },
    ] },
  { field: 'goodEvent', group: 'Emotional', kind: 'single', prompt: 'Did anything make your day today?',
    info: 'This asks about a single good moment that stood out — not whether the day was generally good.',
    autoInfoKey: 'mood.goodEvent',
    options: [
      { label: 'Made my day', value: GoodEvent.MadeMyDay },
      { label: 'A nice moment', value: GoodEvent.ANiceMoment },
      { label: 'No', value: GoodEvent.No },
    ] },
  { field: 'outlook', group: 'Emotional', kind: 'single', prompt: 'How do you feel about tomorrow?',
    options: [
      { label: "Can't wait", value: Outlook.CantWait },
      { label: 'Excited', value: Outlook.Excited },
      { label: 'Indifferent', value: Outlook.Indifferent },
      { label: 'Worried', value: Outlook.Worried },
      { label: 'Dreading it', value: Outlook.DreadingIt },
    ] },
  { field: 'laughed', group: 'Emotional', kind: 'single', prompt: 'Did you laugh today?',
    options: [
      { label: 'Yes', value: 1, icon: Laugh },
      { label: 'Not today', value: 0, icon: Meh },
    ] },
];

// The "Everything, and more" override icon for the activities question (kept
// out of QUESTIONS since that option is synthesized in the component).
export { Sparkles as chaoticActivityIcon };
