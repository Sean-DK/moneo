import { useCategories } from './queries';
import { Chip } from '../../components/Chip';
import { DEFAULT_CATEGORY_COLOR } from '../../lib/design/color';

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
  variant = 'row',
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  variant?: 'grid' | 'row';
}) {
  const { categories, effectiveId } = useEffectiveCategory(selectedId);
  if (!categories) return null;

  return (
    <div className={variant === 'grid' ? 'grid grid-cols-3 gap-2' : 'flex gap-1.75 overflow-x-auto'}>
      {categories.map((c) => {
        const selected = effectiveId === c.id;
        return (
          <Chip
            key={c.id}
            selected={selected}
            onClick={() => onSelect(c.id)}
            color={c.color ?? DEFAULT_CATEGORY_COLOR}
            variant={variant === 'row' ? 'accent' : 'tint'}
            size={variant}
            dot
          >
            {c.name}
          </Chip>
        );
      })}
    </div>
  );
}
