import {
  DayRating, Productivity, Weather, Location, FreeTime, Social, Sleep,
  AteWell, Exercise, Sickness, StressEvent, GoodEvent, Outlook, Activities,
  type MoodEntry,
} from '../../lib/db/types';

// Which MoodEntry field a question writes to.
export type MoodField = keyof Omit<MoodEntry,
  keyof import('../../lib/db/types').Syncable | 'moodDate' | 'repeatDayAutoSkipped'>;

export interface Option {
  label: string;
  value: number;      // the encoded enum value (or flag bit for multi)
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
      { label: 'Sunny', value: Weather.Sunny },
      { label: 'Cloudy', value: Weather.Cloudy },
      { label: 'Rainy', value: Weather.Rainy },
      { label: 'Snowy', value: Weather.Snowy },
      { label: "Don't know", value: Weather.DontKnow },
    ] },
  { field: 'activities', group: 'Activity', kind: 'multi',
    prompt: 'What did you spend most of the day doing?',
    info: 'Pick all that apply. Choose "Everything, and more" for days too hectic or scattered to break down — it supercedes the others.',
    autoInfoKey: 'mood.activities',
    options: [
      { label: 'Working', value: Activities.Working },
      { label: 'Chores & Errands', value: Activities.ChoresErrands },
      { label: 'Hobbies', value: Activities.Hobbies },
      { label: 'Relaxing', value: Activities.Relaxing },
      { label: 'Socializing', value: Activities.Socializing },
      // "Everything, and more" (chaotic) handled specially in the component.
    ] },
  { field: 'location', group: 'Activity', kind: 'single', prompt: 'Where did you spend most of your day?',
    options: [
      { label: 'Inside', value: Location.Inside },
      { label: 'Outside', value: Location.Outside },
      { label: 'A bit of both', value: Location.Both },
    ] },
  { field: 'freeTime', group: 'Activity', kind: 'single', prompt: 'How much free time did you have today?',
    options: [
      { label: 'More than enough', value: FreeTime.MoreThanEnough },
      { label: 'Enough', value: FreeTime.Enough },
      { label: 'Not enough', value: FreeTime.NotEnough },
      { label: 'None', value: FreeTime.None },
      { label: "Don't know", value: FreeTime.DontKnow },
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
      { label: "Don't know", value: Sleep.DontKnow },
    ] },
  { field: 'ateWell', group: 'Physical', kind: 'single', prompt: 'Did you eat well today?',
    options: [
      { label: 'Yes', value: AteWell.Yes },
      { label: 'I think so', value: AteWell.IThinkSo },
      { label: 'Not really', value: AteWell.NotReally },
      { label: 'No', value: AteWell.No },
      { label: "Don't know", value: AteWell.DontKnow },
    ] },
  { field: 'exercise', group: 'Physical', kind: 'single', prompt: 'Did you exercise today?',
    options: [
      { label: 'Yes', value: Exercise.Yes },
      { label: 'Yes, I tried to', value: Exercise.Tried },
      { label: 'No', value: Exercise.No },
    ] },
  { field: 'sickness', group: 'Physical', kind: 'single', prompt: 'Were you sick today?',
    options: [
      { label: 'No', value: Sickness.No },
      { label: 'A little off', value: Sickness.ALittleOff },
      { label: 'Yes', value: Sickness.Yes },
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
      { label: 'Yes', value: 1 },
      { label: 'Not today', value: 0 },
    ] },
];