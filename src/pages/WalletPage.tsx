import { useCallback, useEffect, useState } from 'react';
import type { Address } from 'viem';
import { usePrivyAccount } from '../hooks/useTurnkeyAccount';
import { requestGasTokens } from '../lib/faucet';
import { fetchVendorDelegate } from '../lib/coreReads';
import { publicClient, faucetContractAbi, FAUCET_ADDRESS, formatEth } from '../lib/chain';

interface RoleState {
  vendor: Address | null;
  delegate: Address | null;
}

type GasState =
  | { kind: 'idle' }
  | { kind: 'requesting' }
  | { kind: 'ok'; txHash: string }
  | { kind: 'error'; message: string };

const ZERO = '0x0000000000000000000000000000000000000000';

export function WalletPage() {
  const { account, address, email, loading, isAuthenticated, hasEmbeddedWallet, createEmbeddedWallet } = usePrivyAccount();
  const [balance, setBalance] = useState<bigint | null>(null);
  const [faucetBalance, setFaucetBalance] = useState<bigint | null>(null);
  const [faucetBalanceError, setFaucetBalanceError] = useState<string | null>(null);
  const [vendorBalance, setVendorBalance] = useState<bigint | null>(null);
  const [roles, setRoles] = useState<RoleState>({ vendor: null, delegate: null });
  const [gasState, setGasState] = useState<GasState>({ kind: 'idle' });
  const [copied, setCopied] = useState(false);
  const [creatingWallet, setCreatingWallet] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Loads the faucet balance (public on-chain data, independent of the user's wallet).
  const loadFaucetBalance = useCallback(async () => {
    setFaucetBalanceError(null);
    try {
      const faucetBal = (await publicClient.readContract({
        address: FAUCET_ADDRESS,
        abi: faucetContractAbi,
        functionName: 'getContractBalance',
        args: [],
      })) as bigint;
      setFaucetBalance(faucetBal);
    } catch (e) {
      const msg = (e as Error)?.message ?? String(e);
      setFaucetBalanceError(msg);
      console.error('faucet balance load failed', e);
    }
  }, []);

  // Loads the user's own wallet balance — only when the embedded wallet is provisioned.
  const loadUserBalance = useCallback(async () => {
    if (!address) {
      setBalance(null);
      return;
    }
    try {
      const walletBal = await publicClient.getBalance({ address });
      setBalance(walletBal);
    } catch (e) {
      console.error('user balance load failed', e);
    }
  }, [address]);

  // Loads the vendor contract's ETH balance — independent of the user's wallet
  // so it appears even before the delegated wallet is provisioned.
  const loadVendorBalance = useCallback(async (vendorAddr?: Address) => {
    const targetVendor = vendorAddr ?? roles.vendor;
    if (!targetVendor) {
      setVendorBalance(null);
      return;
    }
    try {
      const vendorBal = await publicClient.getBalance({ address: targetVendor });
      setVendorBalance(vendorBal);
    } catch (e) {
      console.error('vendor balance load failed', e);
    }
  }, [roles.vendor]);

  // On mount: load faucet balance + roles, then vendor balance from on-chain roles.
  useEffect(() => {
    loadFaucetBalance();
    loadUserBalance();
    fetchVendorDelegate()
      .then((r) => {
        setRoles(r);
        void loadVendorBalance(r.vendor);
      })
      .catch((e) => console.error('role load failed', e));
  }, [loadFaucetBalance, loadUserBalance, loadVendorBalance]);

  // Refresh balances shortly after a confirmed drip (tx mined = funds landed).
  useEffect(() => {
    if (gasState.kind === 'ok') {
      const t = setTimeout(() => {
        void loadUserBalance();
        void loadVendorBalance();
        void loadFaucetBalance();
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [gasState, loadUserBalance, loadVendorBalance, loadFaucetBalance]);

  const copyAddress = useCallback(() => {
    if (!address) return;
    void navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [address]);

  const requestGas = useCallback(async () => {
    if (!account || !address) return;
    setGasState({ kind: 'requesting' });
    const result = await requestGasTokens(account, address);
    setGasState(
      result.ok
        ? { kind: 'ok', txHash: result.detail }
        : { kind: 'error', message: result.detail },
    );
  }, [account, address]);

  const isVendor = !!address && address.toLowerCase() === roles.vendor?.toLowerCase();
  const isDelegate = !!address && address.toLowerCase() === roles.delegate?.toLowerCase();
  const rolesKnown = roles.vendor !== null;

  const onCreateWallet = useCallback(async () => {
    setCreatingWallet(true);
    setWalletError(null);
    try {
      const err = await createEmbeddedWallet();
      if (err) setWalletError(err);
    } finally {
      setCreatingWallet(false);
    }
  }, [createEmbeddedWallet]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Wallet & Gas</h1>
        <p className="mt-1 text-sm text-slate-400">
          Your embedded admin wallet. Gas for on-chain operations comes from the faucet.
        </p>
      </div>

      {loading && (
        <div className="rounded-xl border border-amber-700/50 bg-amber-900/20 p-4 text-sm text-amber-200">
          Provisioning embedded wallet...
        </div>
      )}

      {isAuthenticated && !hasEmbeddedWallet && !loading && (
        <div className="rounded-2xl border border-amber-700/50 bg-amber-900/20 p-5">
          <p className="text-sm font-semibold text-amber-200">Create your admin wallet</p>
          <p className="mt-1 text-xs text-amber-200/80">
            You're signed in, but this account has no embedded wallet yet. The dashboard signs
            every on-chain action (generate codes, deactivate, gas requests) with a Privy embedded
            wallet — create one to unlock those actions.
          </p>
          <button
            onClick={() => void onCreateWallet()}
            disabled={creatingWallet}
            className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creatingWallet ? 'Creating wallet…' : 'Create embedded wallet'}
          </button>
          {walletError && (
            <p className="mt-2 break-all text-xs text-amber-200/90">{walletError}</p>
          )}
        </div>
      )}

      {/* Wallet card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">Embedded wallet</div>
            <div className="mt-1 font-mono text-lg text-indigo-300">{address ?? 'provisioning...'}</div>
            <div className="mt-1 text-xs text-slate-400">{email ?? '—'}</div>
          </div>
          {address && (
            <button
              onClick={copyAddress}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
            >
              {copied ? 'âœ“ Copied' : 'Copy address'}
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-950/60 p-4">
            <div className="text-xs text-slate-400">This wallet's balance</div>
            <div className="mt-1 text-2xl font-bold">
              {balance === null ? '—' : `${formatEth(balance)} ETH`}
            </div>
          </div>
          <div className="rounded-xl bg-slate-950/60 p-4">
            <div className="text-xs text-slate-400">Faucet contract balance</div>
            <div className="mt-1 text-2xl font-bold">
              {faucetBalanceError
                ? `Error: ${faucetBalanceError}`
                : faucetBalance === null
                ? '—'
                : `${formatEth(faucetBalance)} ETH`}
            </div>
          </div>

          {roles.vendor && (
            <div className="rounded-xl bg-slate-950/60 p-4">
              <div className="text-xs text-slate-400">Vendor ETH balance</div>
              <div className="mt-1 text-2xl font-bold">
                {vendorBalance === null ? '—' : `${formatEth(vendorBalance)} ETH`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Role card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="text-xs uppercase tracking-wide text-slate-400">
          On-chain roles (AutoSchool360 core)
        </div>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-20 font-semibold text-slate-300">Vendor:</span>
            <span className="font-mono text-slate-400">{roles.vendor ?? '…'}</span>
            {isVendor && (
              <span className="rounded bg-emerald-900/60 px-2 py-0.5 text-xs text-emerald-300">you</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-20 font-semibold text-slate-300">Delegate:</span>
            <span className="font-mono text-slate-400">
              {roles.delegate && roles.delegate !== ZERO ? roles.delegate : 'not assigned'}
            </span>
            {isDelegate && (
              <span className="rounded bg-emerald-900/60 px-2 py-0.5 text-xs text-emerald-300">you</span>
            )}
          </div>
        </div>

        {!isVendor && !isDelegate && address !== null && rolesKnown && (
          <div className="mt-4 rounded-xl border border-amber-700/50 bg-amber-900/20 p-4 text-sm text-amber-200">
            This wallet is not the vendor or delegate yet. The vendor must call{' '}
            <code className="font-mono text-amber-200">setDelegate({address})</code> once so this
            wallet can generate and deactivate codes.
          </div>
        )}
      </div>

      {/* Gas card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">Request gas from faucet</div>
            <div className="mt-1 text-xs text-slate-400">
              Signs a gas request with your embedded wallet; the faucet server drips ETH to this
              address and only confirms after the transfer is mined on-chain.
            </div>
          </div>
          <button
            onClick={() => void requestGas()}
            disabled={!account || gasState.kind === 'requesting'}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {gasState.kind === 'requesting' ? 'Requesting…' : 'Request gas'}
          </button>
        </div>

        {gasState.kind === 'ok' && (
          <div className="mt-4 rounded-xl border border-emerald-700/50 bg-emerald-900/20 p-4 text-sm text-emerald-200">
            Funds sent ✓ tx: <span className="font-mono break-all">{gasState.txHash}</span>
          </div>
        )}
        {gasState.kind === 'error' && (
          <div className="mt-4 rounded-xl border border-red-700/50 bg-red-900/20 p-4 text-sm text-red-200">
            Gas request failed: {gasState.message}
          </div>
        )}
      </div>
    </div>
  );
}





