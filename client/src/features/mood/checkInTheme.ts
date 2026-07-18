import type { Option, Question } from './questions';

// Design tokens specific to the "Quiet Field" check-in flow — a darker,
// dimmed-down delta on top of the app-wide tokens in index.css.
// See "# Moneo Design System — Check-in handoff" for the full spec.

export const CHECKIN_CANVAS = '#08090A';
export const GHOST_TEXT = '#9A9D98';
export const GHOST_DIVIDER = 'rgba(255,255,255,.06)';

export const SECTION_ACCENT: Record<Question['group'], { accent: string; orb: string }> = {
  Mood: { accent: '#3FD0C4', orb: 'rgba(63,208,196,.28)' },
  Activity: { accent: '#6EA2E8', orb: 'rgba(91,147,222,.26)' },
  Physical: { accent: '#5FBE86', orb: 'rgba(95,190,134,.26)' },
  Emotional: { accent: '#A98FE0', orb: 'rgba(169,143,224,.26)' },
};

const SCALE_RAMP = ['#3FD0C4', '#6CC9A2', '#D8C56A', '#E0A05A', '#DD7D70'];
export const NEUTRAL_DOT = '#4A4D48';

function lerpHex(hexA: string, hexB: string, t: number): string {
  const a = parseInt(hexA.slice(1), 16);
  const b = parseInt(hexB.slice(1), 16);
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const lerp = (x: number, y: number) => Math.round(x + (y - x) * t);
  const r = lerp(ar, br), g = lerp(ag, bg), bl = lerp(ab, bb);
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Sample the best→worst spectrum ramp at position t (0 = best, 1 = worst). */
export function scaleDotColor(t: number): string {
  const pos = t * (SCALE_RAMP.length - 1);
  const i = Math.min(Math.floor(pos), SCALE_RAMP.length - 2);
  return lerpHex(SCALE_RAMP[i], SCALE_RAMP[i + 1], pos - i);
}

/** The leading spectrum-dot color for a scale option, by its position among non-neutral options. */
export function optionRampColor(options: Option[], index: number): string {
  const opt = options[index];
  if (opt.neutral) return NEUTRAL_DOT;
  const substantive = options.filter((o) => !o.neutral);
  const pos = substantive.indexOf(opt);
  const t = substantive.length > 1 ? pos / (substantive.length - 1) : 0;
  return scaleDotColor(t);
}
