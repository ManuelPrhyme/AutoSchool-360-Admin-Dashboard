import { useCallback, useEffect, useState } from 'react';
import type { Address } from 'viem';
import { formatDuration, LICENSE_STATUS } from '../lib/chain';
import { fetchAllSchools, type SchoolRow } from '../lib/coreReads';
import { StatusBadge } from '../components/StatusBadge';
import { useContractEvents } from '../hooks/useContractEvents';

export function SchoolsPage({ onRegenerate }: { onRegenerate: (school: Address) => void }) {
  const [schools, setSchools] = useState<SchoolRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // WebSocket event listener for real-time updates
  useContractEvents({
    onSchoolRegistered: () => refresh(),
    onLicenseActivated: () => refresh(),
    onCodeDeactivated: () => refresh(),
  });

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const rows = await fetchAllSchools();
      // Sort schools by registeredAt descending (most recently registered first)
      rows.sort((a, b) => (b.registeredAt > a.registeredAt ? 1 : b.registeredAt < a.registeredAt ? -1 : 0));
      setSchools(rows);
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
        <h2 className="text-lg font-semibold text-ink-primary">
          Registered Schools {schools && <span className="text-ink-secondary">({schools.length})</span>}
        </h2>
        <button
          onClick={() => refresh()}
          disabled={busy}
          className="btn-neutral text-sm"
        >
          {busy ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="alert-danger">{error}</div>}

      {schools && schools.length === 0 && (
        <p className="text-ink-muted">No schools have registered on-chain yet.</p>
      )}

      {schools && schools.length > 0 && (
        <div className="panel">
          <table className="min-w-full text-left text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Remaining</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="table-body">
              {schools.map((s) => (
                <tr key={s.address} className="hover:bg-surface-hover">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink-primary">{s.name || '(unnamed)'}</div>
                      <div className="text-xs text-ink-secondary">{s.email}</div>
                    </td>
                    <td className="px-4 py-3 code-mono">{s.address}</td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3 text-ink-secondary text-xs">{s.expiresAt > 0n ? new Date(Number(s.expiresAt) * 1000).toLocaleString() : '—'}</td>
                    <td className="px-4 py-3 text-ink-secondary text-xs">{s.status > 0 ? formatDuration(Number(s.remainingSeconds)) : '—'}</td>
                    <td className="px-4 py-3">
                      {s.status === 3 && (
                        <button
                          onClick={() => onRegenerate(s.address)}
                          className="btn-brand text-xs"
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

      <div className="grid grid-cols-2 gap-2 text-ink-muted text-xs sm:grid-cols-4">
        {LICENSE_STATUS.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  );
}
