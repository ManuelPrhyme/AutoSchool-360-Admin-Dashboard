import { useEffect, useState } from 'react';
import { useTurnkey } from '@turnkey/react-wallet-kit';
import { createTurnkeyWalletClient } from '../lib/wallet';
import { TURNKEY_ORGANIZATION_ID } from '../config';
import type { Address, LocalAccount, WalletClient } from 'viem';

export interface TurnkeyAccountState {
  account: LocalAccount | null;
  walletClient: WalletClient | null;
  address: Address | null;
  email: string | null;
  error: string | null;
  loading: boolean;
}

/**
 * Bridges the authenticated Turnkey session (useTurnkey) into a viem
 * LocalAccount + WalletClient usable for on-chain reads and writes.
 */
export function useTurnkeyAccount(): TurnkeyAccountState {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { client, user, wallets } = useTurnkey() as any;

  const [account, setAccount] = useState<LocalAccount | null>(null);
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!client || !wallets?.length) return;
    const accountAddress = wallets[0]?.accounts?.[0]?.address as Address | undefined;
    if (!accountAddress) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    createTurnkeyWalletClient({
      client,
      organizationId: TURNKEY_ORGANIZATION_ID,
      accountAddress,
    })
      .then((result) => {
        if (cancelled) return;
        setAccount(result.account);
        setWalletClient(result.walletClient);
        setAddress(result.account.address as Address);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setError((e as any)?.message ?? String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [client, wallets]);

  const email = (user?.username as string) ?? (user?.email as string) ?? null;
  return { account, walletClient, address, email, error, loading };
}
