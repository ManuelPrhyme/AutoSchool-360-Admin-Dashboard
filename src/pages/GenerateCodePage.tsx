import { useCallback, useEffect, useState } from 'react';
import type { Address, WalletClient } from 'viem';
import { fetchAllSchools, type SchoolRow } from '../lib/coreReads';
import { generateCode, contractErrorDetail } from '../lib/writes';
import { usePrivyAccount } from '../hooks/useTurnkeyAccount';
import { CopyButton, ShareButton } from '../components/CopyShareButtons';
import { StatusBadge } from '../components/StatusBadge';
import { DataCard, DataCardRow } from '../components/DataCard';
import { useContractEvents } from '../hooks/useContractEvents';

export function GenerateCodePage({ walletClient, prefillSchool, onGenerated }: { walletClient: WalletClient | null; prefillSchool: Address | null; onGenerated: () => void }) {
  const { account } = usePrivyAccount();

  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<Address | ''>('');
  const [periodDays, setPeriodDays] = useState('30');
  const [graceDays, setGraceDays] = useState('7');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ txHash: string; code?: string } | null>(null);

  const loadSchools = useCallback(async () => {
    try { const rows = await fetchAllSchools(); setSchools(rows); if (prefillSchool) setSelectedSchool(prefillSchool); }
    catch (e) { setError((e as Error)?.message ?? String(e)); }
  }, [prefillSchool]);
  useEffect(() => { loadSchools(); }, [loadSchools]);
  useEffect(() => { if (prefillSchool) setSelectedSchool(prefillSchool); }, [prefillSchool]);

  useContractEvents({
    onSchoolRegistered: () => { void loadSchools(); },
  });

  async function onSubmit() {
    if (!walletClient || !selectedSchool) return;
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await generateCode(
        walletClient, account!, selectedSchool as Address,
        BigInt(Math.max(1, Number(periodDays) || 1) * 86400),
        BigInt(Math.max(0, Number(graceDays) || 0) * 86400)
      );
      setResult(res); onGenerated();
    } catch (e) { setError(contractErrorDetail(e)); }
    finally { setBusy(false); }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-ink-primary">Generate Activation Code</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Creates a one-time-use code in the format <span className="code-mono">ACT-236785-4024</span> valid
          for <span className="font-semibold text-warn-text">1 hour only</span> (until used). The school must
          activate it within 1 hour of generation — generate it right before handing it over. License +
          grace period begin when the school activates it.
        </p>
      </div>

      {/* Registered schools — stacked cards on mobile (no horizontal scroll),
          table on desktop. Same data, two presentations (Toptal). */}
      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-primary">Registered schools</h3>
          <span className="text-xs text-ink-muted">{schools.length} total</span>
        </div>
        {schools.length === 0 ? (
          <p className="text-sm text-ink-muted">No schools registered on-chain yet.</p>
        ) : (
          <>
            {/* Mobile stacked cards */}
            <div className="max-h-72 space-y-2 overflow-auto md:hidden">
              {schools.map(s => (
                <DataCard key={s.address}>
                  <div className="flex items-center justify-between gap-2 pb-1">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-ink-primary">{s.name || '(unnamed)'}</div>
                      <div className="truncate text-xs text-ink-secondary">{s.email}</div>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                  <DataCardRow label="Address" value={s.address} mono />
                </DataCard>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden max-h-72 overflow-auto rounded-lg md:block" style={{ border: '1px solid var(--color-surface-border)' }}>
              <table className="min-w-full text-left text-sm">
                <thead className="table-head">
                  <tr><th className="px-3 py-2">School</th><th className="px-3 py-2">Address</th><th className="px-3 py-2">Status</th></tr>
                </thead>
                <tbody className="table-body">
                  {schools.map(s => (
                    <tr key={s.address} className="hover:bg-surface-hover">
                      <td className="px-3 py-2"><div className="font-medium text-ink-primary">{s.name || '(unnamed)'}</div><div className="text-xs text-ink-secondary">{s.email}</div></td>
                      <td className="code-mono px-3 py-2">{s.address}</td>
                      <td className="px-3 py-2"><StatusBadge status={s.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <label className="field-label"><span>Registered school</span>
        <select value={selectedSchool} onChange={e => setSelectedSchool(e.target.value as Address)} className="field-input">
          <option value="">— select a school —</option>
          {schools.map(s => <option key={s.address} value={s.address}>{s.name || '(unnamed)'} — {s.address}</option>)}
        </select>
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="field-label"><span>License period (days)</span><input type="number" min={1} inputMode="numeric" value={periodDays} onChange={e => setPeriodDays(e.target.value)} className="field-input" /></label>
        <label className="field-label"><span>Grace period (days)</span><input type="number" min={0} inputMode="numeric" value={graceDays} onChange={e => setGraceDays(e.target.value)} className="field-input" /></label>
      </div>

      <button onClick={onSubmit} disabled={!walletClient || !selectedSchool || busy} className="btn-brand w-full">
        {busy ? 'Generating… (confirm in your embedded wallet)' : 'Generate code'}
      </button>

      {error && <div className="alert-danger">{error}</div>}

      {result && (
        <div className="alert-ok">
          <p className="kpi-label">Code generated ✓</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-lg px-3 py-2 font-mono text-sm text-ok-text" style={{ backgroundColor: 'var(--color-surface-base)' }}>{result.code ?? '(code unavailable — check event)'}</code>
            {result.code && (
              <>
                <CopyButton text={result.code} />
                <ShareButton text={result.code} title="AutoSchool360 activation code" />
              </>
            )}
          </div>
          <p className="mt-2 break-all font-mono text-xs text-ink-muted">tx: {result.txHash}</p>
          <p className="mt-2 text-xs text-ink-secondary">Copy or share this code with the school — they enter it in the AutoTable app to activate.</p>
        </div>
      )}
    </div>
  );
}
