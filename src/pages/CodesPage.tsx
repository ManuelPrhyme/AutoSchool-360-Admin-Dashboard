import { useCallback, useEffect, useState } from 'react';
import type { Address, LocalAccount, WalletClient } from 'viem';
import { formatDuration, shortAddress } from '../lib/chain';
import { fetchAllCodes, fetchAllSchools, type CodeRow, type SchoolRow } from '../lib/coreReads';
import { deactivateCode, contractErrorDetail } from '../lib/writes';
import { CopyButton, ShareButton } from '../components/CopyShareButtons';
import { useContractEvents } from '../hooks/useContractEvents';

export function CodesPage({ walletClient, account }: { walletClient: WalletClient | null; account: LocalAccount | null }) {
  const [codes, setCodes] = useState<CodeRow[] | null>(null);
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deactivating, setDeactivating] = useState<string | null>(null);

  // WebSocket event listener for real-time updates
  useContractEvents({
    onCodeGenerated: () => refresh(),
    onLicenseActivated: () => refresh(),
    onCodeDeactivated: () => refresh(),
  });

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const codes = await fetchAllCodes();
      const schools = await fetchAllSchools();
      // Sort codes by expiresAt descending (most recently generated first)
      codes.sort((a, b) => (b.expiresAt > a.expiresAt ? 1 : b.expiresAt < a.expiresAt ? -1 : 0));
      setCodes(codes);
      setSchools(schools);
    } catch (e) {
      setError((e as Error)?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  // Prefetching the rest of the information and crossing it out on the scope of creation and admin
  // Attibution to the crosser and deployer for the scale of the contract is only going to be 
  // Scaled for the distance of the divider

  const schoolNameByAddr = (addr: Address): string => {
    const s = schools.find((s) => s.address.toLowerCase() === addr.toLowerCase());
    return s?.name || '(unnamed)';
  };

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
      <div className="flex items-center justify-end">
        <button
          onClick={() => refresh()}
          disabled={busy}
          className="btn-neutral text-xs"
        >
          {busy ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="alert-danger">{error}</div>}

      {codes && codes.length === 0 && (
        <p className="text-ink-muted">No activation codes have been generated yet.</p>
      )}

      {codes && codes.length > 0 && (
        <div className="panel">
          <div className="border-b px-4 py-2.5 text-sm font-semibold text-ink-primary" style={{ borderColor: 'var(--color-surface-border)' }}>
            Activation Codes {codes && <span className="text-ink-secondary">({codes.length})</span>}
          </div>
          <table className="w-full table-fixed text-left text-sm">
            <colgroup>
              <col />
              <col />
              <col />
              <col className="w-[9%]" />
              <col className="w-[9%]" />
              <col />
              <col className="w-[13%]" />
              <col className="w-[10%]" />
              <col className="w-[16%]" />
            </colgroup>
            <thead className="table-head">
              <tr>
                <th className="table-header-cell">Code</th>
                <th className="table-header-cell">School</th>
                <th className="table-header-cell">School address</th>
                <th className="table-header-cell">Period</th>
                <th className="table-header-cell">Grace</th>
                <th className="table-header-cell">Code expires</th>
                <th className="table-header-cell">State</th>
                <th className="table-header-cell">Assigned to</th>
                <th className="table-header-cell"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="table-body">
              {codes.map((c) => (
                <tr key={c.code} className="hover:bg-surface-hover">
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <span className="code-mono truncate">{c.code}</span>
                      <CopyButton
                        text={c.code}
                        label="Copy"
                        className="shrink-0 rounded border border-slate-600 px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-70"
                      />
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="truncate font-semibold text-ink-primary">{schoolNameByAddr(c.school)}</div>
                  </td>
                  <td className="table-cell code-mono truncate" title={c.school}>{shortAddress(c.school)}</td>
                  <td className="table-cell text-ink-secondary">{formatDuration(Number(c.period))}</td>
                  <td className="table-cell text-ink-secondary">{formatDuration(Number(c.gracePeriod))}</td>
                  <td className="table-cell text-ink-secondary">
                    {c.expiresAt > 0n ? new Date(Number(c.expiresAt) * 1000).toLocaleString() : '—'}
                  </td>
                  <td className="table-cell whitespace-nowrap">
                    {c.isActive
                      ? (<span className="badge-ok">Unused / valid</span>)
                      : (<span className="badge-danger">Consumed / deactivated</span>)}
                  </td>
                  <td className="table-cell">
                    {c.isActive
                      ? (<span className="text-ink-muted">pending activation</span>)
                      : (<span className="text-ok-text">activated</span>)}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center justify-end gap-2">
                      {c.isActive && (
                        <ShareButton
                          text={c.code}
                          title="AutoSchool360 activation code"
                          className="shrink-0 rounded border border-indigo-500 px-2 py-0.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-600 hover:text-white disabled:opacity-70"
                        />
                      )}
                      {c.isActive && walletClient && (
                        <button
                          onClick={() => onDeactivate(c.code)}
                          disabled={deactivating === c.code}
                          className="btn-outline text-xs"
                          style={{ color: 'var(--color-danger-base)' }}
                        >
                          {deactivating === c.code ? 'Deactivating…' : 'Deactivate'}
                        </button>
                      )}
                    </div>
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
