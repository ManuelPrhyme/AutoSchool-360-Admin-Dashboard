export const SEPOLIA_CHAIN_ID = 11155111

export const CORE_CONTRACT_ADDRESS =
  (import.meta.env.VITE_CORE_CONTRACT_ADDRESS as string) ??
  '0x3b03c89b28f41dc49061083ee42f2d34f1df492a'

export const FAUCET_CONTRACT_ADDRESS =
  (import.meta.env.VITE_FAUCET_CONTRACT_ADDRESS as string) ??
  '0xfb845b8001b0c07ba793c27aa0c056b236ec755f'

export const RPC_URL =
  (import.meta.env.VITE_RPC_URL as string) ??
  'https://ethereum-sepolia-rpc.publicnode.com'

export const TURNKEY_ORGANIZATION_ID =
  (import.meta.env.VITE_TURNKEY_ORGANIZATION_ID as string) ?? ''

export const FAUCET_API_URL =
  (import.meta.env.VITE_FAUCET_API_URL as string) ?? 'http://localhost:3000'
