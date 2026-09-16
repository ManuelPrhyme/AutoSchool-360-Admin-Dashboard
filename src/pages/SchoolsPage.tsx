import { useCallback, useEffect, useState } from 'react';
import type { Address } from 'viem';
import { formatDuration, LICENSE_STATUS, shortAddress } from '../lib/chain';
import { fetchAllSchools, type SchoolRow } from '../lib/coreReads';
import { StatusBadge } from '../components/StatusBadge';
import { LastUpdated } from '../components/LastUpdated';
import { DataCard, DataCardRow } from '../components/DataCard';
import { pct, schoolStatusCounts, searchSchools } from '../lib/kpi';
import { useContractEvents } from '../hooks/useContractEvents';

const SEARCH_STORAGE_KEY = 'autoschool360.schoolsSearch';

function safeGetStoredSchoolSearch(): string {
  try {
    return localStorage.getItem(SEARCH_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function safeStoreSchoolSearch(next: string) {
  try {
    localStorage.setItem(SEARCH_STORAGE_KEY, next);
  } catch {
    /* best-effort */
  }
}

export function SchoolsPage({ onRegenerate }: { onRegenerate: (school: Address) => void }) {
  const [schools, setSchools] = useState<SchoolRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [query, setQuery] = useState<string>(() => safeGetStoredSchoolSearch());

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
      setUpdatedAt(new Date());
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

  // KPI headline — DataCamp: lead with the numbers that answer "are we good?"
  const { active: activeCount, grace: graceCount, expired: expiredCount } = schoolStatusCounts(schools ?? []);
  const shownSchools = schools ? searchSchools(schools, query) : null;
  const shownCount = shownSchools?.length ?? 0;

  /** Persist the search query so it survives page switches and reloads. */
  const setQueryPersisted = useCallback((next: string) => {
    setQuery(next);
    safeStoreSchoolSearch(next);
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-ink-primary">Registered Schools {schools && <span className="text-ink-secondary">({schools.length})</span>}</h2>
        <LastUpdated at={updatedAt} onRefresh={() => void refresh()} busy={busy} />
      </div>

      {/* KPI strip — inverted pyramid top layer (status first).
          Percentages give an at-a-glance ratio (Medium: "converting to ratios
          ... makes more meaningful comparisons"). */}
      {schools && schools.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="kpi-card">
            <div className="kpi-label">Total</div>
            <div className="kpi-value">{schools.length}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Active</div>
            <div className="kpi-value text-ok-text">{activeCount}</div>
            <div className="kpi-hint">{pct(activeCount, schools.length)} of schools</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Grace period</div>
            <div className="kpi-value text-warn-text">{graceCount}</div>
            <div className="kpi-hint">{pct(graceCount, schools.length)} of schools</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Expired</div>
            <div className="kpi-value text-danger-text">{expiredCount}</div>
            <div className="kpi-hint">{pct(expiredCount, schools.length)} of schools</div>
          </div>
        </div>
      )}

      {error && <div className="alert-danger">{error}</div>}

      {schools && schools.length === 0 && (
        <p className="text-ink-muted">No schools have registered on-chain yet.</p>
      )}

      {/* Search — same pattern as the codes page: above content, persists,
          empty state names the query. */}
      {schools && schools.length > 0 && (
        <label className="block">
          <span className="kpi-label">Search by name, email, or address</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQueryPersisted(e.target.value)}
            placeholder="e.g. Lincoln or 0x1f…"
            className="field-input mt-1"
            aria-label="Search schools by name, email, or address"
          />
        </label>
      )}

      {schools && shownSchools && shownSchools.length === 0 && schools.length > 0 && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-ink-muted">No schools match "{query.trim()}"</p>
          <button onClick={() => setQueryPersisted('')} className="btn-outline text-xs">
            ✕ Clear search
          </button>
        </div>
      )}

      {/* Mobile: stacked cards (Toptal stacked-cards pattern).
          Desktop: full table. Same data, two presentations. */}
      {schools && schools.length > 0 && shownSchools && shownSchools.length > 0 && (
        <>
          {/* Stacked cards — small screens */}
          <div className="space-y-2 md:hidden">
            {shownSchools.map((s) => (
              <DataCard
                key={s.address}
                footer={
                  s.status === 3 ? (
                    <button onClick={() => onRegenerate(s.address)} className="btn-brand text-xs">
                      Regenerate code
                    </button>
                  ) : undefined
                }
              >
                <div className="flex items-center justify-between gap-2 pb-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-ink-primary">{s.name || '(unnamed)'}</div>
                    <div className="truncate text-xs text-ink-secondary">{s.email}</div>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <DataCardRow label="Address" value={shortAddress(s.address)} mono />
                <DataCardRow
                  label="Expires"
                  value={s.expiresAt > 0n ? new Date(Number(s.expiresAt) * 1000).toLocaleString() : '—'}
                />
                <DataCardRow label="Remaining" value={s.status > 0 ? formatDuration(Number(s.remainingSeconds)) : '—'} />
              </DataCard>
            ))}
          </div>

          {/* Table — medium screens and up */}
          <div className="panel hidden md:block">
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
                {shownSchools.map((s) => (
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
        </>
      )}

      <div className="grid grid-cols-2 gap-2 text-ink-muted text-xs sm:grid-cols-4">
        {LICENSE_STATUS.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  );
}
