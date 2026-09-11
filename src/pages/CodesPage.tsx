import { useCallback, useEffect, useState } from 'react';
import type { LocalAccount, WalletClient } from 'viem';
import { formatDuration } from '../lib/chain';
import { fetchAllCodes, type CodeRow } from '../lib/coreReads';
import { deactivateCode, contractErrorDetail } from '../lib/writes';

export function CodesPage({ walletClient, account }: { walletClient: WalletClient | null; account: LocalAccount | null }) {
  const [codes, setCodes] = useState<CodeRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deactivating, setDeactivating] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setCodes(await fetchAllCodes());
    } catch (e) {
      setError((e as Error)?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  async function onDeactivate(code: string) {
    if (!walletClient || !account) return;
    setDeactivating(code);
    setError(null);
    try {
      await deactivateCode(walletClient, account, code);
      await refresh();
    } catch (e) {
      setError(contractErrorDetail(e));
    } finally {
      setDeactivating(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          Activation Codes {codes && <span className="text-slate-500">({codes.length})</span>}
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

      {codes && codes.length === 0 && (
        <p className="text-sm text-slate-500">No activation codes have been generated yet.</p>
      )}

      {codes && codes.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Grace</th>
                <th className="px-4 py-3">Code expires</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/60 text-slate-200">
              {codes.map((c) => (
                <tr key={c.code} className="hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-mono text-xs">{c.code}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.school}</td>
                  <td className="px-4 py-3 text-xs">{formatDuration(Number(c.period))}</td>
                  <td className="px-4 py-3 text-xs">{formatDuration(Number(c.gracePeriod))}</td>
                  <td className="px-4 py-3 text-xs">
                    {c.expiresAt > 0n ? new Date(Number(c.expiresAt) * 1000).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {c.isActive ? (
                      <span className="rounded-full bg-emerald-900/60 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-700">
                        Unused / valid
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-700 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
                        Consumed / deactivated
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.isActive && walletClient && (
                      <button
                        onClick={() => onDeactivate(c.code)}
                        disabled={deactivating === c.code}
                        className="rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-600 disabled:opacity-50"
                      >
                        {deactivating === c.code ? 'Deactivating…' : 'Deactivate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
