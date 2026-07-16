import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db/db';
import type { Category } from '../../lib/db/types';

/** All live (non-deleted) categories, in sort order. `undefined` = still loading. */
export function useCategories(): Category[] | undefined {
  return useLiveQuery(async () => {
    const rows = await db.categories.filter((c) => !c.isDeleted).toArray();
    return rows.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  });
}