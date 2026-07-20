export interface ActivityPreset {
  label: string;
  categoryName: string;   // resolved to a category ID at render time
}

/** Fixed order, grouped by category. */
export const ACTIVITY_PRESETS: ActivityPreset[] = [
  { label: 'Breakfast', categoryName: 'General' },
  { label: 'Lunch', categoryName: 'General' },
  { label: 'Dinner', categoryName: 'General' },
  { label: 'Snacking', categoryName: 'General' },
  { label: 'Getting Ready', categoryName: 'General' },
  { label: 'Showering', categoryName: 'General' },
  { label: 'Napping', categoryName: 'General' },
  { label: 'Sleeping', categoryName: 'General' },

  { label: 'TV', categoryName: 'Free Time' },
  { label: 'Movie', categoryName: 'Free Time' },
  { label: 'Gaming', categoryName: 'Free Time' },
  { label: 'Reading', categoryName: 'Free Time' },
  { label: 'Hobby', categoryName: 'Free Time' },
  { label: 'Relaxing', categoryName: 'Free Time' },

  { label: 'Dishes', categoryName: 'Chores' },
  { label: 'Laundry', categoryName: 'Chores' },
  { label: 'Mowing', categoryName: 'Chores' },
  { label: 'Cleaning', categoryName: 'Chores' },
  { label: 'Cooking', categoryName: 'Chores' },
  { label: 'Trash', categoryName: 'Chores' },
  { label: 'Vacuuming', categoryName: 'Chores' },
  { label: 'Mopping', categoryName: 'Chores' },
  { label: 'Kids', categoryName: 'Chores' },
  { label: 'Car', categoryName: 'Chores' },
  { label: 'Yard Work', categoryName: 'Chores' },
  { label: 'Shovel Snow', categoryName: 'Chores' },

  { label: 'Groceries', categoryName: 'Errands' },
  { label: 'Shopping', categoryName: 'Errands' },
  { label: 'Post Office', categoryName: 'Errands' },
  { label: 'Bank', categoryName: 'Errands' },
  { label: 'Doctor', categoryName: 'Errands' },
  { label: 'Pharmacy', categoryName: 'Errands' },
  { label: 'Veterinarian', categoryName: 'Errands' },
  { label: 'Mechanic', categoryName: 'Errands' },
  { label: 'Dry Cleaner', categoryName: 'Errands' },
  { label: 'Gas', categoryName: 'Errands' },

  { label: 'Working', categoryName: 'Work' },
  { label: 'Commuting', categoryName: 'Work' },
  { label: 'In a meeting', categoryName: 'Work' },
  { label: 'Check Email', categoryName: 'Work' },

  { label: 'Exercising', categoryName: 'Health' },
  { label: 'Walking', categoryName: 'Health' },
  { label: 'Running', categoryName: 'Health' },
  { label: 'Biking', categoryName: 'Health' },
  { label: 'Swimming', categoryName: 'Health' },
  { label: 'Lifting', categoryName: 'Health' },
  { label: 'Stretching', categoryName: 'Health' },
  { label: 'Yoga', categoryName: 'Health' },
  { label: 'Cardio', categoryName: 'Health' },
  { label: 'Gym', categoryName: 'Health' },
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