export function StatusBadge({ status }: { status: number }) {
  const map: Record<number, { label: string; cls: string }> = {
    0: { label: 'Not licensed', cls: 'bg-slate-700 text-slate-300' },
    1: { label: 'Active', cls: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700' },
    2: { label: 'Grace period', cls: 'bg-amber-900/60 text-amber-300 border border-amber-700' },
    3: { label: 'Expired', cls: 'bg-rose-900/60 text-rose-300 border border-rose-700' },
  };
  const s = map[status] ?? map[0];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>;
}
