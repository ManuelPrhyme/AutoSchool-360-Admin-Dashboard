/**
 * Freshness stamp — DataCamp guideline: "Always display an explicit
 * 'Last updated' timestamp, so users know if the data is up-to-date."
 */
export function LastUpdated({ at, onRefresh, busy }: { at: Date | null; onRefresh: () => void; busy?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-ink-muted">
        {at ? `Updated ${at.toLocaleTimeString()}` : 'Loading…'}
      </span>
      <button
        onClick={onRefresh}
        disabled={busy}
        className="btn-neutral text-xs"
        style={{ backgroundColor: 'transparent', color: 'var(--color-ink-secondary)', border: '1px solid var(--color-surface-border)' }}
      >
        {busy ? 'Loading…' : 'Refresh'}
      </button>
    </div>
  );
}
