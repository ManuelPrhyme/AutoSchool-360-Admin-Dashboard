import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { Address } from 'viem';
import { usePrivy } from '@privy-io/react-auth';
import { usePrivyAccount } from './hooks/useTurnkeyAccount';
import { LoginScreen } from './components/LoginScreen';

// Pages are code-split so the login screen paints before the web3 bundle
// (viem + Privy) finishes downloading; they share vendor chunks via
// manualChunks in vite.config.ts.
const WalletPage = lazy(() => import('./pages/WalletPage').then((m) => ({ default: m.WalletPage })));
const SchoolsPage = lazy(() => import('./pages/SchoolsPage').then((m) => ({ default: m.SchoolsPage })));
const CodesPage = lazy(() => import('./pages/CodesPage').then((m) => ({ default: m.CodesPage })));
const GenerateCodePage = lazy(() => import('./pages/GenerateCodePage').then((m) => ({ default: m.GenerateCodePage })));

type Page = 'wallet' | 'schools' | 'codes' | 'generate';

const NAV: { id: Page; label: string; short: string; icon: JSX.Element }[] = [
  {
    id: 'wallet',
    label: 'Wallet & Gas',
    short: 'Wallet',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M21 7.28V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2.28A2 2 0 0 0 22 15V9a2 2 0 0 0-1-1.72ZM20 9v6h-7V9h7Z" /></svg>
    ),
  },
  {
    id: 'schools',
    label: 'Schools',
    short: 'Schools',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 3 1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3Zm0 2.23L19.53 9 12 12.77 4.47 9 12 5.23ZM7 12.46l5 2.73 5-2.73v3.51L12 18.9l-5-2.93v-3.51Z" /></svg>
    ),
  },
  {
    id: 'codes',
    label: 'Activation Codes',
    short: 'Codes',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M20 2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2ZM4 4h7v16H4V4Zm9 16V4h7v16h-7Z" /></svg>
    ),
  },
  {
    id: 'generate',
    label: 'Generate / Renew',
    short: 'Generate',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 2 9.8 8.2 3.5 9.3l4.6 4.3-1.1 6.4L12 17l5 3-1.1-6.4 4.6-4.3-6.3-1.1L12 2Z" /></svg>
    ),
  },
];

export default function App() {
  const privy = usePrivy();
  const { address, email, walletClient, account, isAuthenticated, loading } = usePrivyAccount();

  const [page, setPage] = useState<Page>('wallet');
  const [prefillSchool, setPrefillSchool] = useState<Address | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const authenticated = isAuthenticated;

  const goToGenerate = useCallback((school: Address | null) => {
    setPrefillSchool(school);
    setPage('generate');
  }, []);

  const handleLogout = useCallback(() => {
    privy.logout();
    setPage('wallet');
    setPrefillSchool(null);
    setMenuOpen(false);
  }, [privy]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [menuOpen]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  if (!authenticated || loading) return <LoginScreen />;

  const pageLabel = NAV.find((n) => n.id === page)?.label ?? '';

  return (
    <div className="min-h-screen bg-surface-base">
      <header className="sticky top-0 z-40 border-b bg-surface-elevated/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <button className="btn-outline tap-target p-2" style={{ color: 'var(--color-ink-secondary)', borderColor: 'var(--color-surface-border)' }} onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
            </button>
            <div>
              <div className="text-sm font-bold text-ink-primary">AutoSchool360</div>
              <div className="text-xs text-ink-secondary">Admin Dashboard</div>
            </div>
          </div>
          <nav className="hidden md:flex flex-wrap gap-1 flex-1 justify-center">
            {NAV.map((item) => (
              <button key={item.id} onClick={() => setPage(item.id)} className="btn-outline text-sm" style={{ color: page === item.id ? 'var(--color-brand-soft)' : 'var(--color-ink-secondary)', backgroundColor: page === item.id ? 'var(--color-brand-base)' : undefined, borderColor: page === item.id ? 'var(--color-brand-base)' : undefined }}>
                {item.label}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-xs text-ink-secondary">{email ?? 'Signed in'}</div>
              <div className="font-mono text-xs text-brand">{address ? `${address.slice(0,6)}...${address.slice(-4)}` : 'provisioning...'}</div>
            </div>
            <button onClick={handleLogout} className="btn-outline text-xs" style={{ color: 'var(--color-ink-secondary)' }}>Sign out</button>
          </div>
        </div>
        <div className="md:hidden border-t bg-surface-elevated/70 px-4 py-2">
          <nav className="flex items-center gap-2 text-xs text-ink-secondary" aria-label="Breadcrumb">
            <span className="text-ink-muted">Home</span>
            <svg className="h-3 w-3 text-ink-muted" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6v6m0 0v6m0-6h4m-4 0H6"/></svg>
            <span className="text-ink-primary font-medium">{pageLabel}</span>
          </nav>
        </div>
      </header>
      {menuOpen && <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setMenuOpen(false)} aria-hidden="true"/>}
      <aside ref={menuRef} className={"fixed inset-y-0 right-0 z-50 w-72 transform transition-transform duration-200 ease-in-out md:hidden " + (menuOpen ? 'translate-x-0' : 'translate-x-full')} style={{ backgroundColor: 'var(--color-surface-elevated)', borderLeft: '1px solid var(--color-surface-border)' }} aria-hidden={!menuOpen}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--color-surface-border)' }}>
          <span className="text-sm font-bold text-ink-primary">Menu</span>
          <button onClick={() => setMenuOpen(false)} className="btn-outline tap-target p-1" style={{ color: 'var(--color-ink-secondary)', borderColor: 'var(--color-surface-border)' }} aria-label="Close menu">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>
        <nav className="p-4 space-y-1" aria-label="Mobile navigation">
          {NAV.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => { setPage(item.id); setMenuOpen(false); }}
              className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-surface-hover"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ backgroundColor: page === item.id ? 'var(--color-brand-base)' : 'var(--color-surface-card)', color: page === item.id ? 'var(--color-ink-primary)' : 'var(--color-ink-muted)' }}>{idx + 1}</span>
              <div>
                <div className="text-sm font-medium" style={{ color: page === item.id ? 'var(--color-brand-soft)' : 'var(--color-ink-primary)' }}>{item.label}</div>
                <div className="text-xs text-ink-muted">Home / {item.label}</div>
              </div>
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t p-4" style={{ borderColor: 'var(--color-surface-border)' }}>
          <div className="rounded-lg bg-surface-card p-3">
            <div className="text-xs text-ink-secondary">Signed in as</div>
            <div className="mt-1 font-mono text-sm text-ink-primary">{email}</div>
            <div className="mt-2 font-mono text-xs text-brand">{address ? `${address.slice(0,6)}...${address.slice(-4)}` : '—'}</div>
          </div>
        </div>
      </aside>
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 md:px-6 md:pb-6 lg:px-8">
        <nav className="hidden md:flex items-center gap-2 mb-4 text-xs text-ink-secondary" aria-label="Breadcrumb">
          <span className="text-ink-muted">Home</span>
          <svg className="h-3 w-3 text-ink-muted" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6v6m0 0v6m0-6h4m-4 0H6"/></svg>
          {NAV.filter((n, i) => i <= NAV.indexOf(NAV.find((n2) => n2.id === page)!)).map((n, i) => (
            <span key={n.id} className="flex items-center gap-2">
              <span className="text-ink-primary font-medium">{n.label}</span>
              {i < NAV.indexOf(NAV.find((n2) => n2.id === page)!) && <svg className="h-3 w-3 text-ink-muted" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6v6m0 0v6m0-6h4m-4 0H6"/></svg>}
            </span>
          ))}
        </nav>
        {page === 'wallet' && <Suspense fallback={<PageSkeleton />}><WalletPage /></Suspense>}
        {page === 'schools' && <Suspense fallback={<PageSkeleton />}><SchoolsPage onRegenerate={(school) => goToGenerate(school)} /></Suspense>}
        {page === 'codes' && <Suspense fallback={<PageSkeleton />}><CodesPage walletClient={walletClient} account={account} /></Suspense>}
        {page === 'generate' && <Suspense fallback={<PageSkeleton />}><GenerateCodePage walletClient={walletClient} prefillSchool={prefillSchool} onGenerated={() => { setPrefillSchool(null); setPage('codes'); }} /></Suspense>}
      </main>

      {/* Mobile bottom navigation — thumb zone (Toptal: bottom nav is the
          mobile standard; primary destinations always one tap away). */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t md:hidden"
        style={{ backgroundColor: 'var(--color-surface-elevated)', borderColor: 'var(--color-surface-border)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Primary"
      >
        <div className="mx-auto grid max-w-md grid-cols-4">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 py-2 text-xs transition"
              style={{ color: page === item.id ? 'var(--color-brand-soft)' : 'var(--color-ink-muted)' }}
              aria-current={page === item.id ? 'page' : undefined}
            >
              {item.icon}
              <span>{item.short}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

/** Suspense fallback matching the KPI card rhythm (interactive states:
 * never leave a tap without feedback). */
function PageSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading page">
      <div className="kpi-card h-20 animate-pulse" />
      <div className="kpi-card h-32 animate-pulse" />
      <div className="kpi-card h-32 animate-pulse" />
    </div>
  );
}
