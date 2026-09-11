import { decodeEventLog, type Address, type LocalAccount, type WalletClient } from 'viem';
import { CORE_ADDRESS, chain, coreContractAbi, publicClient } from './chain';

export interface ContractWriteResult {
  txHash: string;
  code?: string;   // only for generateCode — parsed from CodeGenerated event
}

/** Vendor/delegate: generate a new activation code for a registered school. */
export async function generateCode(
  walletClient: WalletClient,
  account: LocalAccount,
  sa: Address,
  periodSeconds: bigint,
  graceSeconds: bigint,
): Promise<ContractWriteResult> {
  const hash = await walletClient.writeContract({
    address: CORE_ADDRESS,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    abi: coreContractAbi as any,
    functionName: 'generateCode',
    args: [sa, periodSeconds, graceSeconds],
    chain,
    account,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  // The generated code string comes from the CodeGenerated event.
  for (const log of receipt.logs) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const decoded = decodeEventLog({ abi: coreContractAbi as any, data: log.data, topics: log.topics }) as any;
      if (decoded.eventName === 'CodeGenerated') {
        return { txHash: hash, code: decoded.args.code as string };
      }
    } catch {
      // not our event — skip
    }
  }

  // Fallback: the school's current code mapping.
  const code = await publicClient.readContract({
    address: CORE_ADDRESS,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    abi: coreContractAbi as any,
    functionName: 'schoolCurrentCode',
    args: [sa],
  });
  return { txHash: hash, code: code as string };
}

/** Vendor/delegate: invalidate an unused activation code. */
export async function deactivateCode(walletClient: WalletClient, account: LocalAccount, code: string): Promise<string> {
  const hash = await walletClient.writeContract({
    address: CORE_ADDRESS,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    abi: coreContractAbi as any,
    functionName: 'deactivateCode',
    args: [code],
    chain,
    account,
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/** Vendor only: assign the dashboard wallet as the delegate (one-time setup). */
export async function setDelegate(walletClient: WalletClient, account: LocalAccount, newDelegate: Address): Promise<string> {
  const hash = await walletClient.writeContract({
    address: CORE_ADDRESS,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    abi: coreContractAbi as any,
    functionName: 'setDelegate',
    args: [newDelegate],
    chain,
    account,
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/** Human-readable revert reasons for the dashboard error banners. */
export function contractErrorDetail(err: unknown): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = err as any;
  return (
    e?.details ??
    e?.shortMessage ??
    e?.message ??
    String(err)
  );
}
