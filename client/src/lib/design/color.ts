/** Fallback used wherever a category's stored color is null. */
export const DEFAULT_CATEGORY_COLOR = '#8B8F96';

/** `#RRGGBB` -> `rgba(r, g, b, alpha)`, for data-driven chip/dot tints. */
export function tint(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** `#RRGGBB` mixed toward white, for "text on tint" readability atop a selected chip's tinted background. */
export function lighten(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
  const r = mix(parseInt(clean.slice(0, 2), 16));
  const g = mix(parseInt(clean.slice(2, 4), 16));
  const b = mix(parseInt(clean.slice(4, 6), 16));
  return `rgb(${r}, ${g}, ${b})`;
}
