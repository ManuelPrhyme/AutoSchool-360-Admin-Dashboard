import { createWalletClient, http, type LocalAccount, type WalletClient, type Address } from 'viem';
import { sepolia } from 'viem/chains';
import { toViemAccount, type ConnectedWallet } from '@privy-io/react-auth';
import { RPC_URL } from '../config';

/**
 * Creates a viem WalletClient + LocalAccount for the currently authenticated
 * Privy embedded wallet. The embedded wallet is provisioned by Privy on first
 * login; all signing goes through the Privy SDK connector (no raw private key
 * is held client-side).
 *
 * Uses Privy's `toViemAccount` helper so the returned LocalAccount delegates
 * `signTransaction` and `signMessage` to the Privy connector, making it
 * fully compatible with viem's `writeContract` for Sepolia writes
 * (generateCode, deactivateCode, requestGasTokens).
 *
 * The returned WalletClient is used for Sepolia writes. For reads we use the
 * shared publicClient from chain.ts.
 */
export async function createPrivyWalletClient(params: {
  wallet: ConnectedWallet;
}): Promise<{ account: LocalAccount; walletClient: WalletClient }> {
  const account = await toViemAccount({ wallet: params.wallet });

  const walletClient = createWalletClient({
    chain: sepolia,
    transport: http(RPC_URL),
    account,
  });

  return { account: account as unknown as LocalAccount, walletClient };
}
