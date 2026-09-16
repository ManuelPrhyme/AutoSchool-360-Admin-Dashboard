import type { CodeRow, SchoolRow } from './coreReads';

/** Percentage of total, rounded to a useful precision (DataCamp: "round
 * numbers to a useful precision"). Returns '—' when total is 0. */
export function pct(part: number, total: number): string {
  return total === 0 ? '—' : `${Math.round((part / total) * 100)}%`;
}

/** Count of schools in each license status bucket.
 * Status codes: 0 not licensed, 1 active, 2 grace, 3 expired. */
export function schoolStatusCounts(schools: SchoolRow[]): {
  active: number;
  grace: number;
  expired: number;
} {
  return {
    active: schools.filter((s) => s.status === 1).length,
    grace: schools.filter((s) => s.status === 2).length,
    expired: schools.filter((s) => s.status === 3).length,
  };
}

/** Count of codes by lifecycle state. */
export function codeStateCounts(codes: CodeRow[]): { valid: number; used: number } {
  const valid = codes.filter((c) => c.isActive).length;
  return { valid, used: codes.length - valid };
}

/** All / Unused / Consumed filter for the codes list. */
export type CodeFilter = 'all' | 'valid' | 'used';

export function applyCodeFilter(codes: CodeRow[], filter: CodeFilter): CodeRow[] {
  if (filter === 'valid') return codes.filter((c) => c.isActive);
  if (filter === 'used') return codes.filter((c) => !c.isActive);
  return codes;
}

/** Validate a persisted filter value (localStorage round-trips can be tampered
 * with or empty); anything unrecognized falls back to 'all'. */
export function parseCodeFilter(raw: unknown): CodeFilter {
  return raw === 'valid' || raw === 'used' ? raw : 'all';
}

/** Case-insensitive search across the code text and the school's display
 * name. Empty/whitespace queries return the list unchanged. */
export function searchCodes(
  codes: CodeRow[],
  query: string,
  schoolNameOf: (school: CodeRow['school']) => string,
): CodeRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return codes;
  return codes.filter(
    (c) => c.code.toLowerCase().includes(q) || schoolNameOf(c.school).toLowerCase().includes(q),
  );
}

/** True when the user has narrowed the view (non-default filter or a
 * non-empty search) — drives the visibility of the Reset button. */
export function hasActiveViewState(filter: CodeFilter, query: string): boolean {
  return filter !== 'all' || query.trim() !== '';
}
