import { createWalletClient, http, type LocalAccount, type WalletClient, type Address } from 'viem';
import { createAccount } from '@turnkey/viem';
import { chain, RPC_URL } from './chain';

/**
 * Creates a viem LocalAccount backed by the Turnkey embedded wallet
 * (enclave-side signing — the private key never leaves Turnkey),
 * and a WalletClient that signs + broadcasts to Sepolia locally.
 */
export async function createTurnkeyWalletClient(params: {
  client: unknown;               // Turnkey SDK client from useTurnkey().client
  organizationId: string;
  accountAddress: Address;       // embedded wallet account address to sign with
}): Promise<{ account: LocalAccount; walletClient: WalletClient }> {
  const account = await createAccount({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: params.client as any,
    organizationId: params.organizationId,
    signWith: params.accountAddress,
  });

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(RPC_URL),
  });

  return { account, walletClient };
}
