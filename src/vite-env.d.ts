/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TURNKEY_ORGANIZATION_ID?: string
  readonly VITE_CORE_CONTRACT_ADDRESS?: string
  readonly VITE_FAUCET_CONTRACT_ADDRESS?: string
  readonly VITE_RPC_URL?: string
  readonly VITE_FAUCET_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
