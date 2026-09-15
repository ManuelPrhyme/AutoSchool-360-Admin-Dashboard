import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// NOTE on Node's global `Buffer`: Privy's Solana adapter uses it. Instead of
// the network-flaky `vite-plugin-node-polyfills` install (which kept timing
// out), we ship a zero-dependency polyfill at src/bufferPolyfill.ts that is
// imported first in src/main.tsx and installs `globalThis.Buffer`.
const privyEthereumVendor = fileURLToPath(
  new URL('./src/vendor/privy-ethereum/index.mjs', import.meta.url),
)

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // @privy-io/ethereum ships a dead-code bug in every published version:
      // Number('eip1559') -> NaN -> "Unsupported transaction type: eip1559".
      // Alias every import (all roots, from @privy-io/react-auth) to the local
      // fixed copy until an upstream fix lands.
      '@privy-io/ethereum': privyEthereumVendor,
    },
  },
  server: { port: 5173 },
})
