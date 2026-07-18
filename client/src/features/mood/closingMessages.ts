export const CLOSING_MESSAGES_NO_LAUGH: string[] = [
  // Gentle — hard day, didn't laugh. Fill in later.
  'Some days are just hard. Rest up.',
];
export const CLOSING_MESSAGES_YES_LAUGH: string[] = [
  // Encouraging — hard day, but they laughed. Fill in later.
  'A tough day, but you still found a laugh. That counts.',
];

export function pickClosingMessage(laughed: boolean): string {
  const pool = laughed ? CLOSING_MESSAGES_YES_LAUGH : CLOSING_MESSAGES_NO_LAUGH;
  return pool[Math.floor(Math.random() * pool.length)] ?? 'Rest up — tomorrow is a fresh start.';
}