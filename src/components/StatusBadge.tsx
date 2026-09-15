export function StatusBadge({ status }: { status: number }) {
  const s = status === 0
    ? { label: 'Not licensed', cls: 'status-dot-neutral' }
    : status === 1
    ? { label: 'Active', cls: 'status-dot-ok' }
    : status === 2
    ? { label: 'Grace period', cls: 'status-dot-warn' }
    : { label: 'Expired', cls: 'status-dot-danger' };
  return <span className={`status-dot ${s.cls}`}>{s.label}</span>;
}
