import { useCallback, useEffect, useState } from 'react';
import type { Address, WalletClient } from 'viem';
import { fetchAllSchools, type SchoolRow } from '../lib/coreReads';
import { generateCode, contractErrorDetail } from '../lib/writes';
import { usePrivyAccount } from '../hooks/useTurnkeyAccount';
import { CopyButton, ShareButton } from '../components/CopyShareButtons';

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
      <h2 className="text-lg font-semibold text-white">Generate Activation Code</h2>
      <p className="text-sm text-slate-400">Creates a one-time-use code in the format <span className="font-mono text-xs">ACT-236785-4024</span> valid for <span className="font-semibold text-amber-300">1 hour only</span> (until used). The school must activate it within 1 hour of generation — generate it right before handing it over. License + grace period begin when the school activates it.</p>

      {/* Registered schools list */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Registered schools</h3>
          <span className="text-xs text-slate-500">{schools.length} total</span>
        </div>
        {schools.length === 0 ? (
          <p className="text-sm text-slate-500">No schools registered on-chain yet.</p>
        ) : (
          <div className="max-h-72 overflow-auto rounded-lg border border-slate-800">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900 text-xs uppercase text-slate-400">
                <tr><th className="px-3 py-2">School</th><th className="px-3 py-2">Address</th><th className="px-3 py-2">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/40 text-slate-200">
                {schools.map(s => (
                  <tr key={s.address} className="hover:bg-slate-800/50">
                    <td className="px-3 py-2"><div className="font-medium">{s.name || "(unnamed)"}</div><div className="text-xs text-slate-500">{s.email}</div></td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-400">{s.address}</td>
                    <td className="px-3 py-2">
                      {s.status===0 ? (<span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs font-semibold text-slate-300">Not licensed</span>) : s.status===1 ? (<span className="rounded-full bg-emerald-900/60 px-2 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-700">Active</span>) : s.status===2 ? (<span className="rounded-full bg-amber-900/60 px-2 py-0.5 text-xs font-semibold text-amber-300 border border-amber-700">Grace period</span>) : (<span className="rounded-full bg-rose-900/60 px-2 py-0.5 text-xs font-semibold text-rose-300 border border-rose-700">Expired</span>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <label className="block text-sm"><span className="text-slate-300">Registered school</span>
        <select value={selectedSchool} onChange={e => setSelectedSchool(e.target.value as Address)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">
          <option value="">— select a school —</option>
          {schools.map(s => <option key={s.address} value={s.address}>{s.name || "(unnamed)"} — {s.address}</option>)}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm"><span className="text-slate-300">License period (days)</span><input type="number" min={1} value={periodDays} onChange={e => setPeriodDays(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
        <label className="block text-sm"><span className="text-slate-300">Grace period (days)</span><input type="number" min={0} value={graceDays} onChange={e => setGraceDays(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
      </div>

      <button onClick={onSubmit} disabled={!walletClient || !selectedSchool || busy} className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50">{busy ? "Generating… (confirm in your embedded wallet)" : "Generate code"}</button>

      {error && <div className="rounded-lg bg-rose-900/40 px-4 py-3 text-sm text-rose-300">{error}</div>}

      {result && (
        <div className="rounded-xl border border-emerald-800 bg-emerald-900/30 p-5">
          <p className="text-xs uppercase tracking-wide text-emerald-400">Code generated ✓</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-lg bg-slate-950 px-3 py-2 font-mono text-sm text-emerald-300">{result.code ?? "(code unavailable — check event)"}</code>
            {result.code && (
              <>
                <CopyButton text={result.code} />
                <ShareButton text={result.code} title="AutoSchool360 activation code" />
              </>
            )}
          </div>
          <p className="mt-2 font-mono text-xs text-slate-500">tx: {result.txHash}</p>
          <p className="mt-2 text-xs text-slate-400">Copy or share this code with the school — they enter it in the AutoTable app to activate.</p>
        </div>
      )}
    </div>
  );
}
