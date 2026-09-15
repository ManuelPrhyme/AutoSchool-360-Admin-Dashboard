import { createPublicClient, http, type Address, type PublicClient } from 'viem';
import { sepolia } from 'viem/chains';
import coreAbi from '../abi/coreAbi.json';
import faucetAbi from '../abi/faucetAbi.json';

export const RPC_URL = 'https://eth-sepolia.g.alchemy.com/v2/m-WHCzI6-wEUpwA6ncQZdgxki5TdNBB3';
export const FAUCET_API_URL = 'https://autoschoo360-faucetserver.onrender.com';

export const CORE_ADDRESS = '0x200631B2a58e2611D682AA364F77D3c1EB9ea90d' as Address;
export const FAUCET_ADDRESS = '0xfb845b8001b0c07ba793c27aa0c056b236ec755f' as Address;

export const chain = sepolia;

export const publicClient: PublicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
});

// Expose the raw ABIs for any consumer that needs them.
export { coreAbi, faucetAbi };
// viem wants a strict ABI type; a widening cast keeps TS happy without codegen.
export const coreContractAbi = coreAbi as never;
export const faucetContractAbi = faucetAbi as never;

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0s';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatEth(wei: bigint): string {
  return (Number(wei) / 1e18).toFixed(4);
}

/** Shortens an address to `head` + `..` + `tail` chars, e.g. `0x345..3456`. */
export function shortAddress(addr: string, head = 5, tail = 4): string {
  if (addr.length <= head + tail + 2) return addr;
  return `${addr.slice(0, head)}..${addr.slice(-tail)}`;
}

export const LICENSE_STATUS = ['Not licensed', 'Active', 'Grace period', 'Expired'] as const;

export type LicenseStatusName = (typeof LICENSE_STATUS)[number];
