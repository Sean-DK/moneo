import type { LucideIcon } from 'lucide-react';

export function IconBox({ icon: Icon, size = 31 }: { icon: LucideIcon; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-9 bg-accent/13"
      style={{ width: size, height: size }}
    >
      <Icon size={16} className="text-accent" />
    </div>
  );
}
