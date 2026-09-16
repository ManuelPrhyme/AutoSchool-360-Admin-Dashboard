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
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

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

  const stampFresh = useCallback(() => setUpdatedAt(new Date()), []);

  useEffect(() => {
    stampFresh();
  }, [balance, faucetBalance, stampFresh]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Wallet & Gas</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Your embedded admin wallet. Gas for on-chain operations comes from the faucet.
        </p>
        {updatedAt && (
          <p className="mt-1 text-xs text-ink-muted">Updated {updatedAt.toLocaleTimeString()}</p>
        )}
      </div>

      {loading && (
        <div className="alert-warn">
          Provisioning embedded wallet...
        </div>
      )}

      {isAuthenticated && !hasEmbeddedWallet && !loading && (
        <div className="alert-warn">
          <p className="font-semibold">Create your admin wallet</p>
          <p className="mt-1 text-xs opacity-90">
            You're signed in, but this account has no embedded wallet yet. The dashboard signs
            every on-chain action (generate codes, deactivate, gas requests) with a Privy embedded
            wallet — create one to unlock those actions.
          </p>
          <button
            onClick={() => void onCreateWallet()}
            disabled={creatingWallet}
            className="btn-brand mt-3 w-full sm:w-auto"
          >
            {creatingWallet ? 'Creating wallet…' : 'Create embedded wallet'}
          </button>
          {walletError && (
            <p className="mt-2 break-all text-xs opacity-90">{walletError}</p>
          )}
        </div>
      )}

      {/* Wallet card — KPI balances first (inverted pyramid top layer) */}
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="kpi-label">Embedded wallet</div>
            <div className="mt-1 font-mono text-sm text-brand sm:text-lg">{address ?? 'provisioning...'}</div>
            <div className="mt-1 text-xs text-ink-secondary">{email ?? '—'}</div>
          </div>
          {address && (
            <button onClick={copyAddress} className="btn-outline text-xs">
              {copied ? '✓ Copied' : 'Copy address'}
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <div className="kpi-card">
            <div className="kpi-label">This wallet's balance</div>
            <div className="kpi-value">{balance === null ? '—' : `${formatEth(balance)} ETH`}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Faucet contract balance</div>
            <div className="kpi-value">
              {faucetBalanceError
                ? 'Error'
                : faucetBalance === null
                ? '—'
                : `${formatEth(faucetBalance)} ETH`}
            </div>
            {faucetBalanceError && (
              <div className="kpi-hint break-all text-danger-text">{faucetBalanceError}</div>
            )}
          </div>

          {roles.vendor && (
            <div className="kpi-card">
              <div className="kpi-label">Vendor ETH balance</div>
              <div className="kpi-value">{vendorBalance === null ? '—' : `${formatEth(vendorBalance)} ETH`}</div>
            </div>
          )}
        </div>
      </div>

      {/* Role card */}
      <div className="card">
        <div className="kpi-label">On-chain roles (AutoSchool360 core)</div>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-20 shrink-0 font-semibold text-ink-primary">Vendor:</span>
            <span className="code-mono break-all">{roles.vendor ?? '…'}</span>
            {isVendor && (
              <span className="badge-ok">you</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-20 shrink-0 font-semibold text-ink-primary">Delegate:</span>
            <span className="code-mono break-all">
              {roles.delegate && roles.delegate !== ZERO ? roles.delegate : 'not assigned'}
            </span>
            {isDelegate && (
              <span className="badge-ok">you</span>
            )}
          </div>
        </div>

        {!isVendor && !isDelegate && address !== null && rolesKnown && (
          <div className="alert-warn mt-4">
            This wallet is not the vendor or delegate yet. The vendor must call{' '}
            <code className="font-mono">setDelegate({address})</code> once so this
            wallet can generate and deactivate codes.
          </div>
        )}
      </div>

      {/* Gas card — primary action, full-width tap target on mobile */}
      <div className="card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-ink-primary">Request gas from faucet</div>
            <div className="mt-1 text-xs text-ink-secondary">
              Signs a gas request with your embedded wallet; the faucet server drips ETH to this
              address and only confirms after the transfer is mined on-chain.
            </div>
          </div>
          <button
            onClick={() => void requestGas()}
            disabled={!account || gasState.kind === 'requesting'}
            className="btn-brand w-full sm:w-auto"
          >
            {gasState.kind === 'requesting' ? 'Requesting…' : 'Request gas'}
          </button>
        </div>

        {gasState.kind === 'ok' && (
          <div className="alert-ok mt-4">
            Funds sent ✓ tx: <span className="font-mono break-all">{gasState.txHash}</span>
          </div>
        )}
        {gasState.kind === 'error' && (
          <div className="alert-danger mt-4">
            Gas request failed: {gasState.message}
          </div>
        )}
      </div>
    </div>
  );
}
