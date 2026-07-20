export interface ActivityPreset {
  label: string;
  categoryName: string;   // resolved to a category ID at render time
}

/** Fixed order, grouped by category. */
export const ACTIVITY_PRESETS: ActivityPreset[] = [
  { label: 'Breakfast', categoryName: 'General' },
  { label: 'Lunch', categoryName: 'General' },
  { label: 'Dinner', categoryName: 'General' },
  { label: 'Sleep', categoryName: 'General' },

  { label: 'TV', categoryName: 'Free Time' },
  { label: 'Gaming', categoryName: 'Free Time' },
  { label: 'Reading', categoryName: 'Free Time' },
  { label: 'Hobby', categoryName: 'Free Time' },

  { label: 'Dishes', categoryName: 'Chores' },
  { label: 'Laundry', categoryName: 'Chores' },
  { label: 'Mowing', categoryName: 'Chores' },
  { label: 'Cleaning', categoryName: 'Chores' },
  { label: 'Kids', categoryName: 'Chores' },

  { label: 'Shopping', categoryName: 'Errands' },

  { label: 'Work', categoryName: 'Work' },

  { label: 'Exercise', categoryName: 'Health' },
];

/** Group presets by category, preserving the order above. */
export function groupPresets(): { categoryName: string; presets: ActivityPreset[] }[] {
  const groups: { categoryName: string; presets: ActivityPreset[] }[] = [];
  for (const p of ACTIVITY_PRESETS) {
    const last = groups[groups.length - 1];
    if (last && last.categoryName === p.categoryName) last.presets.push(p);
    else groups.push({ categoryName: p.categoryName, presets: [p] });
  }
  return groups;
}