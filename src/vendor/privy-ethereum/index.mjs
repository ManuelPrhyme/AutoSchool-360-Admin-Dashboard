// Drop-in replacement for the `@privy-io/ethereum` package (see
// ./to-viem-transaction-serializable.mjs for why). Vite aliases
// `@privy-io/ethereum` to this file; react-auth only ever uses these two
// exports, so this is a full behavioural equivalent.
export {
  STRING_TO_NUMBER_TXN_TYPE,
  toViemTransactionSerializable,
} from './to-viem-transaction-serializable.mjs';

export const VERSION = '0.0.2-fixed';