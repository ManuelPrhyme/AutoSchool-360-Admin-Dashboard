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
  build: {
    rollupOptions: {
      output: {
        // Split the heavy web3 vendors out of the app entry so they download
        // in parallel with page chunks and cache independently of app code.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('viem') || id.includes('abitype')) return 'vendor-viem';
          if (id.includes('@privy-io') || id.includes('@solana')) return 'vendor-privy';
          if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
          return undefined;
        },
      },
    },
  },
})
