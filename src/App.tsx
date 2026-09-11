import { useState } from 'react';
import type { Address } from 'viem';
import { useTurnkey } from '@turnkey/react-wallet-kit';
import { LoginScreen } from './components/LoginScreen';
import { WalletPage } from './pages/WalletPage';
import { SchoolsPage } from './pages/SchoolsPage';
import { CodesPage } from './pages/CodesPage';
import { GenerateCodePage } from './pages/GenerateCodePage';
import { useTurnkeyAccount } from './hooks/useTurnkeyAccount';

type Page = 'wallet' | 'schools' | 'codes' | 'generate';

const NAV: { id: Page; label: string }[] = [
  { id: 'wallet', label: 'Wallet & Gas' },
  { id: 'schools', label: 'Schools' },
  { id: 'codes', label: 'Activation Codes' },
  { id: 'generate', label: 'Generate / Renew' },
];

export default function App() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { authState, client, user, logout } = useTurnkey() as any;

  // Auth state: trust `authState` when present, fall back to session heuristics.
  const authenticated = authState
    ? authState === 'authenticated'
    : Boolean(client && user);

  const [page, setPage] = useState<Page>('wallet');
  const [prefillSchool, setPrefillSchool] = useState<Address | null>(null);
  const { address, email, walletClient, account } = useTurnkeyAccount();

  function goToGenerate(school: Address | null) {
    setPrefillSchool(school);
    setPage('generate');
  }

  if (!authenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-lg font-black text-white">
              A
            </div>
            <div>
              <div className="text-sm font-bold">AutoSchool360</div>
              <div className="text-xs text-slate-400">Admin Dashboard</div>
            </div>
          </div>

          <nav className="flex flex-wrap gap-1">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={
                  page === item.id
                    ? 'rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white'
                    : 'rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800'
                }
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-slate-400">{email ?? 'Signed in'}</div>
              <div className="font-mono text-xs text-indigo-300">
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'provisioning wallet...'}
              </div>
            </div>
            {typeof logout === 'function' && (
              <button
                onClick={() => logout()}
                className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {page === 'wallet' && <WalletPage />}
        {page === 'schools' && (
          <SchoolsPage
            onRegenerate={(school) => goToGenerate(school)}
          />
        )}
        {page === 'codes' && <CodesPage walletClient={walletClient} account={account} />}
        {page === 'generate' && (
          <GenerateCodePage
            walletClient={walletClient}
            prefillSchool={prefillSchool}
            onGenerated={() => {
              setPrefillSchool(null);
              setPage('schools');
            }}
          />
        )}
      </main>
    </div>
  );
}
