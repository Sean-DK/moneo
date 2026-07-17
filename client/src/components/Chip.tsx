import type { ReactNode, CSSProperties } from 'react';
import { tint, lighten } from '../lib/design/color';

const SIZE_CLASSES: Record<'grid' | 'row', string> = {
  grid: 'rounded-13 px-1.5 py-2.75 text-[12.5px]',
  row: 'shrink-0 rounded-12 px-3 py-2 text-[12.5px]',
};

export function Chip({
  selected,
  onClick,
  children,
  color,
  variant = 'tint',
  size = 'grid',
  dot = variant === 'tint',
  disabled,
}: {
  selected: boolean;
  onClick?: () => void;
  children: ReactNode;
  color?: string;
  variant?: 'tint' | 'accent';
  size?: 'grid' | 'row';
  dot?: boolean;
  disabled?: boolean;
}) {
  const swatch = color ?? '#8B8F96';
  let style: CSSProperties | undefined;
  let colorClasses: string;

  if (variant === 'accent') {
    colorClasses = selected
      ? 'border-accent bg-accent text-ink-on-accent font-bold'
      : 'border-white/10 bg-elevated text-ink';
  } else if (selected) {
    style = { borderColor: swatch, backgroundColor: tint(swatch, 0.18), color: lighten(swatch, 0.4) };
    colorClasses = 'font-bold';
  } else {
    colorClasses = 'border-white/10 bg-elevated text-ink';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={style}
      className={`flex items-center justify-center gap-1.25 border font-semibold transition-colors disabled:opacity-40 ${SIZE_CLASSES[size]} ${colorClasses}`}
    >
      {dot && <span className="h-1.75 w-1.75 shrink-0 rounded-full" style={{ background: swatch }} />}
      {children}
    </button>
  );
}
