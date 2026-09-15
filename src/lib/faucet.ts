import type { Address, LocalAccount } from 'viem';
import { FAUCET_API_URL } from './chain';

export interface GasRequestResult {
  ok: boolean;
  detail: string;   // txHash on success, error message on failure
}

/**
 * Requests gas from the faucet server. The server only responds 2xx after its
 * drip transaction is mined with status 'success' — so a resolved promise means
 * the ETH has actually been sent on-chain (not just queued).
 *
  * Uses EIP-191 personal_sign (Privy embedded wallets sign this way natively);
 * the faucet server accepts both this and the raw-hash .NET signature.
 */
export async function requestGasTokens(
  account: LocalAccount,
  instanceAddress: Address,
): Promise<GasRequestResult> {
  const message = `Request gas for ${instanceAddress} at ${new Date().toISOString()}`;
  const signature = await account.signMessage({ message });

  const res = await fetch(`${FAUCET_API_URL}/api/faucet/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instanceAddress, message, signature }),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body = await res.json().catch(() => ({} as any));
  if (res.ok) {
    return { ok: true, detail: (body.txHash as string) ?? 'funds sent' };
  }
  return { ok: false, detail: (body.error as string) ?? (body.detail as string) ?? `HTTP ${res.status}` };
}
