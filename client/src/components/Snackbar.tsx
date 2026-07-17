import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function Snackbar({
  icon: Icon,
  message,
  action,
}: {
  icon?: LucideIcon;
  message: ReactNode;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div
      className="fixed inset-x-0 z-20 px-3.5"
      style={{ bottom: 'calc(64px + env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center gap-3 rounded-14 border border-accent/25 bg-snackbar px-3.5 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
        {Icon && <Icon size={17} className="shrink-0 text-accent" />}
        <div className="flex-1 text-[13px] font-medium text-ink">{message}</div>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="shrink-0 text-[12.5px] font-bold tracking-[0.04em] text-accent"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
