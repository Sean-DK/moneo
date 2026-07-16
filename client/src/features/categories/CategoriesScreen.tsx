import { useState } from 'react';
import { useCategories } from './queries';
import { createCategory, renameCategory, deleteCategory, MAX_NAME_LENGTH } from './actions';
import type { Category } from '../../lib/db/types';

export function CategoriesScreen() {
  const categories = useCategories();

  if (categories === undefined) return <p>Loading…</p>;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
      <h2>Categories</h2>
      <NewCategoryRow />
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {categories.map((c) => (
          <CategoryRow key={c.id} category={c} />
        ))}
      </ul>
    </div>
  );
}

function NewCategoryRow() {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    try {
      await createCategory(name, null);
      setName('');
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <input
        value={name}
        maxLength={MAX_NAME_LENGTH}
        placeholder="New category"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void submit()}
      />
      <button onClick={() => void submit()}>Add</button>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
    </div>
  );
}

function CategoryRow({ category }: { category: Category }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(category.name);

  const save = async () => {
    try {
      await renameCategory(category.id, draft);
      setEditing(false);
    } catch {
      /* keep editing on validation failure */
    }
  };

  return (
    <li style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0' }}>
      <span
        style={{
          width: 12, height: 12, borderRadius: 6, flexShrink: 0,
          background: category.color ?? '#ccc',
        }}
      />
      {editing ? (
        <>
          <input
            value={draft}
            maxLength={MAX_NAME_LENGTH}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void save()}
          />
          <button onClick={() => void save()}>Save</button>
          <button onClick={() => setEditing(false)}>Cancel</button>
        </>
      ) : (
        <>
          <span style={{ flexGrow: 1 }}>{category.name}</span>
          <button onClick={() => { setDraft(category.name); setEditing(true); }}>Rename</button>
          <button onClick={() => void deleteCategory(category.id)}>Delete</button>
        </>
      )}
    </li>
  );
}