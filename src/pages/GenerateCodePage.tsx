import { useCallback, useEffect, useState } from 'react';
import type { Address, WalletClient } from 'viem';
import { fetchAllSchools, type SchoolRow } from '../lib/coreReads';
import { generateCode, contractErrorDetail } from '../lib/writes';
import { useTurnkeyAccount } from '../hooks/useTurnkeyAccount';

export function GenerateCodePage({
  walletClient,
  prefillSchool,
  onGenerated,
}: {
  walletClient: WalletClient | null;
  prefillSchool: Address | null;
  onGenerated: () => void;
}) {
  const { account } = useTurnkeyAccount();
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [school, setSchool] = useState<Address | ''>('');
  const [periodDays, setPeriodDays] = useState('30');
  const [graceDays, setGraceDays] = useState('7');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ txHash: string; code?: string } | null>(null);

  const loadSchools = useCallback(async () => {
    try {
      const rows = await fetchAllSchools();
      setSchools(rows);
      if (prefillSchool) setSchool(prefillSchool);
    } catch (e) {
      setError((e as Error)?.message ?? String(e));
    }
  }, [prefillSchool]);

  useEffect(() => {
    loadSchools();
  }, [loadSchools]);

  useEffect(() => {
    if (prefillSchool) setSchool(prefillSchool);
  }, [prefillSchool]);

  async function onSubmit() {
    if (!walletClient || !school) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await generateCode(
        walletClient,
        account!,
        school as Address,
        BigInt(Math.max(1, Number(periodDays) || 1) * 86400),
        BigInt(Math.max(0, Number(graceDays) || 0) * 86400),
      );
      setResult(res);
      onGenerated();
    } catch (e) {
      setError(contractErrorDetail(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-lg font-semibold text-white">Generate Activation Code</h2>
      <p className="text-sm text-slate-400">
        Creates a one-time-use code <span className="font-mono text-xs">ACT-&lt;school&gt;-&lt;nonce&gt;</span>{' '}
        valid for 365 days (until used). The license period and grace period begin when the school
        activates it.
      </p>

      <label className="block text-sm">
        <span className="text-slate-300">Registered school</span>
        <select
          value={school}
          onChange={(e) => setSchool(e.target.value as Address)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        >
          <option value="">— select a school —</option>
          {schools.map((s) => (
            <option key={s.address} value={s.address}>
              {s.name || '(unnamed)'} — {s.address}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm">
          <span className="text-slate-300">License period (days)</span>
          <input
            type="number"
            min={1}
            value={periodDays}
            onChange={(e) => setPeriodDays(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-300">Grace period (days)</span>
          <input
            type="number"
            min={0}
            value={graceDays}
            onChange={(e) => setGraceDays(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          />
        </label>
      </div>

      <button
        onClick={onSubmit}
        disabled={!walletClient || !school || busy}
        className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
      >
        {busy ? 'Generating… (confirm in your embedded wallet)' : 'Generate code'}
      </button>

      {error && <div className="rounded-lg bg-rose-900/40 px-4 py-3 text-sm text-rose-300">{error}</div>}

      {result && (
        <div className="rounded-xl border border-emerald-800 bg-emerald-900/30 p-5">
          <p className="text-xs uppercase tracking-wide text-emerald-400">Code generated ✓</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 break-all rounded-lg bg-slate-950 px-3 py-2 font-mono text-sm text-emerald-300">
              {result.code ?? '(code unavailable — check event)'}
            </code>
            {result.code && (
              <button
                onClick={() => navigator.clipboard.writeText(result.code!)}
                className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-600"
              >
                Copy
              </button>
            )}
          </div>
          <p className="mt-2 font-mono text-xs text-slate-500">tx: {result.txHash}</p>
          <p className="mt-2 text-xs text-slate-400">
            Deliver this code to the school out-of-band — they enter it in the AutoTable app to activate.
          </p>
        </div>
      )}
    </div>
  );
}
