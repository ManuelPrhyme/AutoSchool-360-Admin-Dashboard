import { useCallback, useEffect, useState } from 'react';
import type { Address } from 'viem';
import { formatDuration, LICENSE_STATUS } from '../lib/chain';
import { fetchAllSchools, type SchoolRow } from '../lib/coreReads';
import { StatusBadge } from '../components/StatusBadge';

export function SchoolsPage({ onRegenerate }: { onRegenerate: (school: Address) => void }) {
  const [schools, setSchools] = useState<SchoolRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setSchools(await fetchAllSchools());
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setError((e as any)?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          Registered Schools {schools && <span className="text-slate-500">({schools.length})</span>}
        </h2>
        <button
          onClick={() => refresh()}
          disabled={busy}
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-600 disabled:opacity-50"
        >
          {busy ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="rounded-lg bg-rose-900/40 px-4 py-3 text-sm text-rose-300">{error}</div>}

      {schools && schools.length === 0 && (
        <p className="text-sm text-slate-500">No schools have registered on-chain yet.</p>
      )}

      {schools && schools.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Remaining</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/60 text-slate-200">
              {schools.map((s) => (
                <tr key={s.address} className="hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{s.name || '(unnamed)'}</div>
                    <div className="text-xs text-slate-500">{s.email}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{s.address}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3 text-xs">{s.expiresAt > 0n ? new Date(Number(s.expiresAt) * 1000).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3 text-xs">{s.status > 0 ? formatDuration(Number(s.remainingSeconds)) : '—'}</td>
                  <td className="px-4 py-3">
                    {s.status === 3 && (
                      <button
                        onClick={() => onRegenerate(s.address)}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500"
                      >
                        Regenerate code
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 sm:grid-cols-4">
        {LICENSE_STATUS.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  );
}
