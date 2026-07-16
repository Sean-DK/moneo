import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db/db';
import type { UserSettings } from '../../lib/db/types';

export function useSettings(): UserSettings | undefined {
  return useLiveQuery(async () => {
    const rows = await db.settings.filter((s) => !s.isDeleted).toArray();
    return rows[0]; // one row per user by design
  });
}