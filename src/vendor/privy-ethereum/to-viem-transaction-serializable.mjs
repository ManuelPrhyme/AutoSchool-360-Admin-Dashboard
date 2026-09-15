// Vendored from @privy-io/ethereum@0.0.2 (dist/esm/to-viem-transaction-serializable.mjs)
//
// WHY THIS FILE EXISTS
// --------------------
// Every published version of @privy-io/ethereum has the same dead-code bug: the
// { name -> number } map (STRING_TO_NUMBER_TXN_TYPE) is exported but NEVER used
// inside toViemTransactionSerializable. The function computes `Number(type)`
// directly, so when viem 2.5x+ stamps a transaction request with the NAMED type
// `'eip1559'`, `Number('eip1559')` is `NaN` and the throw is hit:
//
//     Unsupported transaction type: eip1559
//
// This file is behaviourally identical to the upstream 0.0.2 ESM module (same
// export names/signatures, same field mapping), with ONE change:
//
//     const typeNumber = STRING_TO_NUMBER_TXN_TYPE[String(type)] ?? Number(type);
//
// That resolves named types ('eip1559', 'legacy', ...) through the exported map
// and still accepts numeric/hex-numeric types exactly as upstream did.
//
// vite.config.ts aliases `@privy-io/ethereum` -> ./index.mjs so every import
// inside @privy-io/react-auth resolves here. Re-apply this if a future
// `npm update` re-installs the buggy upstream package (or an upstream fix
// lands — see https://github.com/privy-io/privy-js — verify and drop this
// vendor if so).

import { isHex, toHex } from 'viem';

const NUMBER_TO_STRING_TXN_TYPE = {
  0: 'legacy',
  1: 'eip2930',
  2: 'eip1559',
  3: 'eip4844',
  4: 'eip7702',
};

export const STRING_TO_NUMBER_TXN_TYPE = {
  legacy: 0,
  eip2930: 1,
  eip1559: 2,
  eip4844: 3,
  eip7702: 4,
};

const toBigIntIfDefined = (value) => (value !== undefined ? BigInt(value) : undefined);

export function toViemTransactionSerializable(tx) {
  let accessList;
  const { type = 2, ...rest } = typeof tx === 'string' ? JSON.parse(tx) : tx;
  if (rest.accessList && Array.isArray(rest.accessList)) {
    accessList = rest.accessList.map((entry) => (Array.isArray(entry) ? { address: entry[0], storageKeys: entry[1] } : entry));
  } else if (rest.accessList) {
    accessList = Object.entries(rest.accessList).map((entry) => ({ address: entry[0], storageKeys: entry[1] }));
  }
  const chainId = Number(rest.chainId ?? 1);
  const data = isHex(rest.data) ? rest.data : rest.data ? toHex(Uint8Array.from(rest.data)) : undefined;
  const nonce = rest.nonce ? Number(rest.nonce) : undefined;
  const common = {
    chainId,
    data,
    nonce,
    value: toBigIntIfDefined(rest.value),
    gas: toBigIntIfDefined(rest.gas ?? rest.gasLimit),
  };

  // FIX: upstream was `const typeNumber = Number(type)` — breaks on viem's
  // string transaction types ('eip1559'). Resolve named types through the map.
  const typeNumber = STRING_TO_NUMBER_TXN_TYPE[String(type)] ?? Number(type);

  if (typeNumber === 0) {
    return {
      ...rest,
      type: NUMBER_TO_STRING_TXN_TYPE[typeNumber],
      ...common,
      gasPrice: toBigIntIfDefined(rest.gasPrice),
      accessList: undefined,
      maxFeePerGas: undefined,
      maxPriorityFeePerGas: undefined,
    };
  }
  if (typeNumber === 1) {
    return {
      ...rest,
      type: NUMBER_TO_STRING_TXN_TYPE[typeNumber],
      ...common,
      gasPrice: toBigIntIfDefined(rest.gasPrice),
      accessList,
      maxFeePerGas: undefined,
      maxPriorityFeePerGas: undefined,
    };
  }
  if (typeNumber === 2) {
    return {
      ...rest,
      type: NUMBER_TO_STRING_TXN_TYPE[typeNumber],
      ...common,
      nonce,
      accessList,
      maxFeePerGas: toBigIntIfDefined(rest.maxFeePerGas),
      maxPriorityFeePerGas: toBigIntIfDefined(rest.maxPriorityFeePerGas),
      gasPrice: undefined,
      maxFeePerBlobGas: undefined,
    };
  }
  throw new Error(`Unsupported transaction type: ${type}`);
}