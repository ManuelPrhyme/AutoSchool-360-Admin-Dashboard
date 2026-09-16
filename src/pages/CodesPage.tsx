import { useCallback, useEffect, useState } from 'react';
import type { Address, LocalAccount, WalletClient } from 'viem';
import { formatDuration, shortAddress } from '../lib/chain';
import { fetchAllCodes, fetchAllSchools, type CodeRow, type SchoolRow } from '../lib/coreReads';
import { deactivateCode, contractErrorDetail } from '../lib/writes';
import { CopyButton, ShareButton } from '../components/CopyShareButtons';
import { LastUpdated } from '../components/LastUpdated';
import { DataCard, DataCardRow } from '../components/DataCard';
import {
  pct,
  codeStateCounts,
  applyCodeFilter,
  parseCodeFilter,
  searchCodes,
  hasActiveViewState,
  type CodeFilter,
} from '../lib/kpi';
import { useContractEvents } from '../hooks/useContractEvents';

const FILTER_TABS: { id: CodeFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'valid', label: 'Unused' },
  { id: 'used', label: 'Consumed' },
];

const FILTER_STORAGE_KEY = 'autoschool360.codesFilter';
const SEARCH_STORAGE_KEY = 'autoschool360.codesSearch';

/** Best-effort localStorage read; returns null on any failure (private mode,
 * disabled storage). */
function safeGetStoredFilter(): unknown {
  try {
    return localStorage.getItem(FILTER_STORAGE_KEY);
  } catch {
    return null;
  }
}

function safeStoreFilter(next: CodeFilter) {
  try {
    localStorage.setItem(FILTER_STORAGE_KEY, next);
  } catch {
    /* storage unavailable — persistence is best-effort */
  }
}

/** Best-effort localStorage read for the persisted search query. */
function safeGetStoredSearch(): string {
  try {
    return localStorage.getItem(SEARCH_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function safeStoreSearch(next: string) {
  try {
    localStorage.setItem(SEARCH_STORAGE_KEY, next);
  } catch {
    /* best-effort */
  }
}

export function CodesPage({ walletClient, account }: { walletClient: WalletClient | null; account: LocalAccount | null }) {
  const [codes, setCodes] = useState<CodeRow[] | null>(null);
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deactivating, setDeactivating] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [filter, setFilter] = useState<CodeFilter>(() => parseCodeFilter(safeGetStoredFilter()));
  const [query, setQuery] = useState<string>(() => safeGetStoredSearch());

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
      const rows = await fetchAllCodes();
      const schoolRows = await fetchAllSchools();
      // Sort codes by expiresAt descending (most recently generated first)
      rows.sort((a, b) => (b.expiresAt > a.expiresAt ? 1 : b.expiresAt < a.expiresAt ? -1 : 0));
      setCodes(rows);
      setSchools(schoolRows);
      setUpdatedAt(new Date());
    } catch (e) {
      setError((e as Error)?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const schoolNameByAddr = useCallback(
    (addr: Address): string => {
      const s = schools.find((s) => s.address.toLowerCase() === addr.toLowerCase());
      return s?.name || '(unnamed)';
    },
    [schools],
  );

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

  // KPI headline — state of the code inventory at a glance
  const { valid: validCount, used: usedCount } = codeStateCounts(codes ?? []);
  const filtered = codes ? applyCodeFilter(codes, filter) : null;
  const shownCodes = codes && filtered ? searchCodes(filtered, query, schoolNameByAddr) : null;
  const shownCount = shownCodes?.length ?? 0;

  /** Persist the filter selection so it survives page switches and reloads. */
  const setFilterPersisted = useCallback((next: CodeFilter) => {
    setFilter(next);
    safeStoreFilter(next);
  }, []);

  /** Persist the search query alongside the filter. */
  const setQueryPersisted = useCallback((next: string) => {
    setQuery(next);
    safeStoreSearch(next);
  }, []);

  /** Clicking a KPI card applies its matching filter and clears any active
   * search (guidelines: connect the headline to the action). */
  const applyFilterAndClearSearch = useCallback((next: CodeFilter) => {
    setFilterPersisted(next);
    setQueryPersisted('');
  }, [setFilterPersisted, setQueryPersisted]);

  /** One tap back to the pristine view: default filter, empty search. */
  const resetViewState = useCallback(() => {
    applyFilterAndClearSearch('all');
  }, [applyFilterAndClearSearch]);

  const viewStateIsActive = hasActiveViewState(filter, query);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-ink-primary">
          Activation Codes {codes && <span className="text-ink-secondary">({codes.length})</span>}
        </h2>
        <LastUpdated at={updatedAt} onRefresh={() => void refresh()} busy={busy} />
      </div>

      {/* KPI strip — status first (inverted pyramid). Cards are buttons that
          apply their matching filter and clear any active search. */}
      {codes && codes.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <button
            onClick={() => applyFilterAndClearSearch('all')}
            className="kpi-card text-left transition hover:opacity-90"
            aria-label={`Show all ${codes.length} codes`}
          >
            <div className="kpi-label">Total codes</div>
            <div className="kpi-value">{codes.length}</div>
            <div className="kpi-hint">{shownCount} shown</div>
          </button>
          <button
            onClick={() => applyFilterAndClearSearch('valid')}
            className="kpi-card text-left transition hover:opacity-90"
            aria-label={`Filter to ${validCount} unused/valid codes`}
          >
            <div className="kpi-label">Unused / valid</div>
            <div className="kpi-value text-ok-text">{validCount}</div>
            <div className="kpi-hint">{pct(validCount, codes.length)} of all codes</div>
          </button>
          <button
            onClick={() => applyFilterAndClearSearch('used')}
            className="kpi-card text-left transition hover:opacity-90"
            aria-label={`Filter to ${usedCount} consumed codes`}
          >
            <div className="kpi-label">Consumed</div>
            <div className="kpi-value text-danger-text">{usedCount}</div>
            <div className="kpi-hint">{pct(usedCount, codes.length)} of all codes</div>
          </button>
        </div>
      )}

      {/* Search — DataCamp: filters above content, plain labels, 44px target */}
      {codes && codes.length > 0 && (
        <label className="block">
          <span className="kpi-label">Search by code or school name</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQueryPersisted(e.target.value)}
            placeholder="e.g. ACT-2367 or Lincoln High"
            className="field-input mt-1"
            aria-label="Search codes by code text or school name"
          />
        </label>
      )}

      {/* Filter — DataCamp: "five precise filters beat fifteen vague ones". */}
      {codes && codes.length > 0 && (
        <div
          className="grid grid-cols-3 gap-1 rounded-lg p-1 sm:inline-grid sm:w-auto"
          style={{ backgroundColor: 'var(--color-surface-card)', border: '1px solid var(--color-surface-border)' }}
          role="tablist"
          aria-label="Filter codes by state"
        >
          {FILTER_TABS.map((t) => {
            const active = filter === t.id;
            const count = t.id === 'all' ? codes.length : t.id === 'valid' ? validCount : usedCount;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setFilterPersisted(t.id)}
                className="min-h-[44px] rounded-md px-3 text-sm font-semibold transition"
                style={
                  active
                    ? { backgroundColor: 'var(--color-brand-base)', color: 'var(--color-ink-primary)' }
                    : { color: 'var(--color-ink-secondary)' }
                }
              >
                {t.label} <span className="text-xs opacity-80">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Reset — one tap back to the pristine view; only rendered when the
          view is actually narrowed (Toptal: enabled/disabled states must be
          meaningful). */}
      {codes && codes.length > 0 && viewStateIsActive && (
        <button
          onClick={resetViewState}
          className="btn-outline text-sm"
          aria-label="Reset filter and search to show all codes"
        >
          ✕ Clear filter & search
        </button>
      )}

      {error && <div className="alert-danger">{error}</div>}

      {codes && codes.length === 0 && (
        <p className="text-ink-muted">No activation codes have been generated yet.</p>
      )}

      {codes && shownCodes && shownCodes.length === 0 && codes.length > 0 && (
        <p className="text-ink-muted">
          {query.trim()
            ? `No codes match "${query.trim()}"`
            : `No ${filter === 'used' ? 'consumed' : 'unused'} codes right now — switch filters or refresh.`}
        </p>
      )}

      {codes && codes.length > 0 && shownCodes && shownCodes.length > 0 && (
        <>
          {/* Mobile: stacked cards — one card per code, no horizontal scroll */}
          <div className="space-y-2 md:hidden">
            {shownCodes.map((c) => (
              <DataCard
                key={c.code}
                footer={
                  c.isActive ? (
                    <>
                      <ShareButton
                        text={c.code}
                        title="AutoSchool360 activation code"
                        className="shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-70"
                        style={{ color: 'var(--color-brand-soft)', borderColor: 'var(--color-brand-base)' }}
                      />
                      {walletClient && (
                        <button
                          onClick={() => onDeactivate(c.code)}
                          disabled={deactivating === c.code}
                          className="btn-outline text-xs"
                          style={{ color: 'var(--color-danger-text)' }}
                        >
                          {deactivating === c.code ? 'Deactivating…' : 'Deactivate'}
                        </button>
                      )}
                    </>
                  ) : undefined
                }
              >
                <div className="flex items-center justify-between gap-2 pb-2">
                  <span className="code-mono min-w-0 truncate text-sm">{c.code}</span>
                  {c.isActive
                    ? (<span className="badge-ok shrink-0">Unused / valid</span>)
                    : (<span className="badge-danger shrink-0">Consumed</span>)}
                </div>
                <DataCardRow label="School" value={schoolNameByAddr(c.school)} />
                <DataCardRow label="School address" value={shortAddress(c.school)} mono />
                <DataCardRow label="Period" value={formatDuration(Number(c.period))} />
                <DataCardRow label="Grace" value={formatDuration(Number(c.gracePeriod))} />
                <DataCardRow
                  label="Code expires"
                  value={c.expiresAt > 0n ? new Date(Number(c.expiresAt) * 1000).toLocaleString() : '—'}
                />
                <DataCardRow label="Assigned to" value={c.isActive ? 'pending activation' : 'activated'} />
              </DataCard>
            ))}
          </div>

          {/* Desktop: full table */}
          <div className="panel hidden md:block">
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
                {shownCodes.map((c) => (
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
                            style={{ color: 'var(--color-danger-text)' }}
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
        </>
      )}
    </div>
  );
}
