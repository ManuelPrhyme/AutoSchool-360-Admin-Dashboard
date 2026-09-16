import { describe, it, expect } from 'vitest';
import {
  pct,
  schoolStatusCounts,
  codeStateCounts,
  applyCodeFilter,
  parseCodeFilter,
  searchCodes,
  hasActiveViewState,
  type CodeFilter,
} from './kpi';
import type { CodeRow, SchoolRow } from './coreReads';

// Minimal row factories — kpi.ts only touches the fields below.
function school(status: number): SchoolRow {
  return {
    address: `0x${'0'.repeat(39)}${status}` as SchoolRow['address'],
    name: `School ${status}`,
    email: 's@example.com',
    registeredAt: 0n,
    licenseActive: status === 1,
    expiresAt: 0n,
    activationCode: '',
    status,
    remainingSeconds: 0n,
  };
}

function code(isActive: boolean, suffix: string, schoolSeed = '1'): CodeRow {
  return {
    code: `ACT-000000-${suffix}`,
    school: `0x${'0'.repeat(39)}${schoolSeed}` as CodeRow['school'],
    period: 30n * 86400n,
    gracePeriod: 7n * 86400n,
    expiresAt: 0n,
    activatedAt: 0n,
    isActive,
  };
}

describe('pct', () => {
  it('returns an em dash when total is 0', () => {
    expect(pct(0, 0)).toBe('—');
    expect(pct(5, 0)).toBe('—');
  });

  it('returns 0% and 100% at the extremes', () => {
    expect(pct(0, 10)).toBe('0%');
    expect(pct(10, 10)).toBe('100%');
  });

  it('rounds to the nearest whole percent', () => {
    expect(pct(1, 3)).toBe('33%');
    expect(pct(2, 3)).toBe('67%');
    expect(pct(1, 8)).toBe('13%');
  });
});

describe('schoolStatusCounts', () => {
  it('counts each license status bucket', () => {
    const counts = schoolStatusCounts([school(1), school(1), school(2), school(3), school(0)]);
    expect(counts).toEqual({ active: 2, grace: 1, expired: 1 });
  });

  it('returns zeros for an empty list', () => {
    expect(schoolStatusCounts([])).toEqual({ active: 0, grace: 0, expired: 0 });
  });
});

describe('codeStateCounts', () => {
  it('splits valid vs used and the parts sum to the total', () => {
    const counts = codeStateCounts([code(true, '1'), code(true, '2'), code(false, '3')]);
    expect(counts).toEqual({ valid: 2, used: 1 });
    expect(counts.valid + counts.used).toBe(3);
  });

  it('returns zeros for an empty list', () => {
    expect(codeStateCounts([])).toEqual({ valid: 0, used: 0 });
  });
});

describe('applyCodeFilter', () => {
  const rows = [code(true, '1'), code(false, '2'), code(true, '3')];

  it("'valid' keeps only active codes", () => {
    expect(applyCodeFilter(rows, 'valid').map((c) => c.code)).toEqual([
      'ACT-000000-1',
      'ACT-000000-3',
    ]);
  });

  it("'used' keeps only consumed codes", () => {
    expect(applyCodeFilter(rows, 'used').map((c) => c.code)).toEqual(['ACT-000000-2']);
  });

  it("'all' returns every code unchanged", () => {
    expect(applyCodeFilter(rows, 'all')).toHaveLength(3);
  });

  it('returns an empty array (never undefined) when nothing matches', () => {
    expect(applyCodeFilter([], 'valid' satisfies CodeFilter)).toEqual([]);
  });
});

describe('parseCodeFilter', () => {
  it('accepts valid stored values', () => {
    expect(parseCodeFilter('valid')).toBe('valid');
    expect(parseCodeFilter('used')).toBe('used');
    expect(parseCodeFilter('all')).toBe('all');
  });

  it('falls back to "all" for tampered/unknown values', () => {
    expect(parseCodeFilter('garbage')).toBe('all');
    expect(parseCodeFilter(null)).toBe('all');
    expect(parseCodeFilter(undefined)).toBe('all');
    expect(parseCodeFilter(42)).toBe('all');
    expect(parseCodeFilter({ evil: true })).toBe('all');
  });
});

describe('searchCodes', () => {
  const rows = [
    code(true, '111', '1'),
    code(false, '222', '2'),
  ];
  const nameOf = (school: CodeRow['school']) =>
    school.endsWith('1') ? 'Lincoln High' : 'Roosevelt Academy';

  it('returns the list unchanged for empty/whitespace queries', () => {
    expect(searchCodes(rows, '', nameOf)).toHaveLength(2);
    expect(searchCodes(rows, '   ', nameOf)).toHaveLength(2);
  });

  it('matches the code text case-insensitively', () => {
    expect(searchCodes(rows, 'act-000000-2', nameOf)).toHaveLength(1);
    expect(searchCodes(rows, '000000-222', nameOf)[0]?.code).toBe('ACT-000000-222');
  });

  it('matches the school display name case-insensitively', () => {
    const hits = searchCodes(rows, 'lincoln', nameOf);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.code).toBe('ACT-000000-111');
  });

  it('returns empty when nothing matches', () => {
    expect(searchCodes(rows, 'hogwarts', nameOf)).toEqual([]);
  });

  it('composes with applyCodeFilter (filter then search)', () => {
    const onlyValid = applyCodeFilter(rows, 'valid');
    expect(searchCodes(onlyValid, '222', nameOf)).toEqual([]);
    expect(searchCodes(onlyValid, '111', nameOf)).toHaveLength(1);
  });
});

describe('hasActiveViewState', () => {
  it('is false only for the pristine default view', () => {
    expect(hasActiveViewState('all', '')).toBe(false);
    expect(hasActiveViewState('all', '   ')).toBe(false);
  });

  it('is true for any non-default filter', () => {
    expect(hasActiveViewState('valid', '')).toBe(true);
    expect(hasActiveViewState('used', '')).toBe(true);
  });

  it('is true when a search is active, even with the default filter', () => {
    expect(hasActiveViewState('all', 'ACT')).toBe(true);
  });
});
