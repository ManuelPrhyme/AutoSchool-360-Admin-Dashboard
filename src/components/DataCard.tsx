import type { ReactNode } from 'react';

/**
 * Mobile-first stacked card for table rows (Toptal: collapse table rows into
 * "stacked, standalone cards" on small screens; desktop keeps the table).
 * Each item renders as label/value pairs so no context is lost.
 */
export function DataCard({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-surface-elevated)', border: '1px solid var(--color-surface-border)' }}>
      {children}
      {footer && <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t pt-3" style={{ borderColor: 'var(--color-surface-border)' }}>{footer}</div>}
    </div>
  );
}

/** One label/value row inside a DataCard. */
export function DataCardRow({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="shrink-0 text-xs text-ink-secondary">{label}</span>
      <span className={`min-w-0 break-words text-right text-sm text-ink-primary ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}
