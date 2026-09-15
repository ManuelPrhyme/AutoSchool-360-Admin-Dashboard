import { useEffect, useState, useCallback } from 'react';
import { usePrivy, useWallets, useCreateWallet, getEmbeddedConnectedWallet, type ConnectedWallet } from '@privy-io/react-auth';
import { createPrivyWalletClient } from '../lib/wallet';
import type { Address, LocalAccount, WalletClient } from 'viem';

export interface PrivyAccountState {
  account: LocalAccount | null;
  walletClient: WalletClient | null;
  address: Address | null;
  email: string | null;
  wallet: ConnectedWallet | null;
  /** True once the user has a Privy auth session (login completes), even if no
   *  embedded wallet has been provisioned yet. */
  isAuthenticated: boolean;
  /** True once an embedded wallet exists (its address is known). */
  hasEmbeddedWallet: boolean;
  loading: boolean;
  /**
   * Provisions a Privy embedded wallet for the signed-in user (no UI by default).
   * Resolves to `null` on success, or a human-readable error message on failure.
   */
  createEmbeddedWallet: () => Promise<string | null>;
}

/**
 * Bridges the authenticated Privy session into a viem LocalAccount + WalletClient
 * usable for on-chain reads and writes with the embedded wallet.
 *
 * - `usePrivy()` provides the auth session (login/logout, user object).
 * - `useWallets()` + `getEmbeddedConnectedWallet()` provide the wallet object.
 * - `createPrivyWalletClient()` builds a viem WalletClient whose Account
 *   delegates signing to Privy's embedded wallet via `toViemAccount`.
 */
export function usePrivyAccount(): PrivyAccountState {
  const { user, ready } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const embeddedWallet = getEmbeddedConnectedWallet(wallets);

  const [account, setAccount] = useState<LocalAccount | null>(null);
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [wallet, setWallet] = useState<ConnectedWallet | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!embeddedWallet?.address) {
      setAddress(null);
      setAccount(null);
      setWalletClient(null);
      setWallet(null);
      return;
    }

    const addr = embeddedWallet.address as Address;
    setWallet(embeddedWallet);
    setAddress(addr);

    let cancelled = false;
    setLoading(true);

    createPrivyWalletClient({ wallet: embeddedWallet })
      .then((result) => {
        if (!cancelled) {
          setAccount(result.account);
          setWalletClient(result.walletClient);
        }
      })
      .catch(() => {
        // Non-fatal: address is set for reads; writes fail gracefully.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [embeddedWallet?.address, embeddedWallet]);

  const email = user?.email?.address ?? null;
  // "Authenticated" means a Privy auth session exists (email OTP verified, etc.).
  // An embedded wallet is a SEPARATE concern — email login alone does not
  // provision one — so it must not block entering the dashboard.
  const isAuthenticated = ready && Boolean(user);
  const hasEmbeddedWallet = Boolean(embeddedWallet?.address);

  // Provisions an embedded wallet for the signed-in user. With the default
  // provider config Privy secures the wallet client-side without any UI, then
  // `useWallets()` refreshes and the useEffect above builds the viem client.
  const createEmbeddedWallet = useCallback(async (): Promise<string | null> => {
    try {
      await createWallet();
      return null;
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = e as any;
      return err?.message ?? err?.shortMessage ?? String(e);
    }
  }, [createWallet]);

  return {
    account,
    walletClient,
    address,
    email,
    wallet,
    isAuthenticated,
    hasEmbeddedWallet,
    loading,
    createEmbeddedWallet,
  };
}
