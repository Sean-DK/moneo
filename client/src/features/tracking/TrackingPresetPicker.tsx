import { useEffect, useState } from "react";
import { ACTIVITY_PRESETS, type ActivityPreset } from "./presets";
import { useCategories } from "../categories/queries";
import { hexToRgba } from "../mood/checkInTheme";
import { DEFAULT_CATEGORY_COLOR, lighten, tint } from "../../lib/design/color";

export function TrackingPresetPicker({
    categoryId,
    onPick
} : {
    categoryId: string | null,
    onPick: (preset: ActivityPreset) => void
}) {
  const categories = useCategories();
  const [category, setCategory] = useState<string>('General');

  useEffect(() => {
    const cat = categories?.find((c) => c.id === categoryId)
      ?? categories?.find((c) => c.isSystem);
    if (!cat) return;
    setCategory(cat.name);
  }, [categoryId]);

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
          {ACTIVITY_PRESETS.filter(c => c.categoryName === category).map((p) => {
            const cat = categories?.find(c => c.name === category);
            const color = cat?.color ?? DEFAULT_CATEGORY_COLOR;
            return (
              <button
                key={p.label}
                onClick={() => onPick(p)}
                className="flex items-center justify-center gap-1.5 rounded-14 border px-2 py-3 text-[14px] font-semibold"
                style={{
                  borderColor: hexToRgba(color, 0.35),
                  background: tint(color, 0.12),
                  color: lighten(color, 0.4),
                }}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
                {p.label}
              </button>
            )})}
      </div>
    </>
  )
}