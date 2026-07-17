import { Priority } from '../db/types';

export const PRIORITY_COLORS: Record<Priority, string> = {
  [Priority.None]: '#8B8F96',
  [Priority.Low]: '#66A6E6',
  [Priority.Medium]: '#E6C65A',
  [Priority.High]: '#E69150',
  [Priority.Urgent]: '#E86A5E',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.None]: 'None',
  [Priority.Low]: 'Low',
  [Priority.Medium]: 'Med',
  [Priority.High]: 'High',
  [Priority.Urgent]: 'Urgent',
};
