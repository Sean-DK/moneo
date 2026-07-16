import { useCategories } from './queries';

export function useEffectiveCategory(selected: string | null): {
  categories: ReturnType<typeof useCategories>;
  effectiveId: string | null;
} {
  const categories = useCategories();
  if (!categories) return { categories, effectiveId: null };
  const system = categories.find((c) => c.isSystem);
  const stillExists = selected !== null && categories.some((c) => c.id === selected);
  const effectiveId = (stillExists ? selected : null) ?? system?.id ?? categories[0]?.id ?? null;
  return { categories, effectiveId };
}

export function CategoryChips({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { categories, effectiveId } = useEffectiveCategory(selectedId);
  if (!categories) return null;

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {categories.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          style={{
            padding: '6px 12px', borderRadius: 16, cursor: 'pointer',
            border: effectiveId === c.id ? '2px solid #3B82F6' : '1px solid #ccc',
            background: effectiveId === c.id ? '#EFF6FF' : 'white',
          }}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}