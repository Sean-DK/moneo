import { create, update, remove } from '../../lib/db/repo';
import { db } from '../../lib/db/db';
import { requestSync } from '../../lib/sync/scheduler';
import type { Category } from '../../lib/db/types';

export const MAX_NAME_LENGTH = 20;

function validateName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Name is required');
  if (trimmed.length > MAX_NAME_LENGTH) throw new Error(`Max ${MAX_NAME_LENGTH} characters`);
  return trimmed;
}

export async function createCategory(name: string, color: string | null): Promise<Category> {
  const maxSort = (await db.categories.toArray()).reduce((m, c) => Math.max(m, c.sortOrder), -1);
  const row = await create('categories', {
    name: validateName(name),
    color,
    sortOrder: maxSort + 1,
    isSystem: false,
  });
  requestSync();
  return row;
}

export async function renameCategory(id: string, name: string): Promise<void> {
  await update('categories', id, { name: validateName(name) });
  requestSync();
}

export async function deleteCategory(id: string): Promise<void> {
  await remove('categories', id);
  requestSync();
}