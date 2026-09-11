import type { Address, PublicClient } from 'viem';
import { CORE_ADDRESS, coreContractAbi, publicClient } from './chain';

export interface SchoolRow {
  address: Address;
  name: string;
  email: string;
  registeredAt: bigint;
  licenseActive: boolean;
  expiresAt: bigint;
  activationCode: string;
  status: number; // 0 not licensed, 1 active, 2 grace, 3 expired
  remainingSeconds: bigint;
}

export interface CodeRow {
  code: string;
  school: Address;
  period: bigint;
  gracePeriod: bigint;
  expiresAt: bigint;
  activatedAt: bigint;
  isActive: boolean;
}

export interface CodeInfo {
  school: Address;
  period: bigint;
  gracePeriod: bigint;
  expiresAt: bigint;
  activatedAt: bigint;
  isActive: boolean;
}

/** Fetch the full school enumeration + per-school license status. */
export async function fetchAllSchools(client: PublicClient = publicClient): Promise<SchoolRow[]> {
  const count = (await client.readContract({
    address: CORE_ADDRESS,
    abi: coreContractAbi,
    functionName: 'getRegisteredSchoolsCount',
    args: [],
  })) as bigint;

  const rows: SchoolRow[] = [];
  for (let i = 0n; i < count; i++) {
    const addr = (await client.readContract({
      address: CORE_ADDRESS,
      abi: coreContractAbi,
      functionName: 'registeredSchools',
      args: [i],
    })) as Address;

    const [name, email, , registeredAt, licenseActive, expiresAt, activationCode] = (await client.readContract({
      address: CORE_ADDRESS,
      abi: coreContractAbi,
      functionName: 'getSchoolInfo',
      args: [addr],
    })) as [string, string, Address, bigint, boolean, bigint, string];

    const [status, , , remaining] = (await client.readContract({
      address: CORE_ADDRESS,
      abi: coreContractAbi,
      functionName: 'getLicenseStatus',
      args: [addr],
    })) as [number, bigint, bigint, bigint];

    rows.push({
      address: addr,
      name,
      email,
      registeredAt,
      licenseActive,
      expiresAt,
      activationCode,
      status: Number(status),
      remainingSeconds: remaining,
    });
  }
  return rows;
}

/** Fetch the full code enumeration + per-code info. */
export async function fetchAllCodes(client: PublicClient = publicClient): Promise<CodeRow[]> {
  const count = (await client.readContract({
    address: CORE_ADDRESS,
    abi: coreContractAbi,
    functionName: 'getGeneratedCodesCount',
    args: [],
  })) as bigint;

  const rows: CodeRow[] = [];
  for (let i = 0n; i < count; i++) {
    const code = (await client.readContract({
      address: CORE_ADDRESS,
      abi: coreContractAbi,
      functionName: 'generatedCodes',
      args: [i],
    })) as string;

    const [school, period, gracePeriod, expiresAt, activatedAt, isActive] = (await client.readContract({
      address: CORE_ADDRESS,
      abi: coreContractAbi,
      functionName: 'getCodeInfo',
      args: [code],
    })) as [Address, bigint, bigint, bigint, bigint, boolean];
    rows.push({ code, school, period, gracePeriod, expiresAt, activatedAt, isActive });
  }
  return rows;
}

export async function getCodeInfo(code: string, client: PublicClient = publicClient): Promise<CodeInfo> {
  const [school, period, gracePeriod, expiresAt, activatedAt, isActive] = (await client.readContract({
    address: CORE_ADDRESS,
    abi: coreContractAbi,
    functionName: 'getCodeInfo',
    args: [code],
  })) as [Address, bigint, bigint, bigint, bigint, boolean];
  return { school, period, gracePeriod, expiresAt, activatedAt, isActive };
}

/** Who is the current vendor + delegate on the core contract? */
export async function fetchVendorDelegate(client: PublicClient = publicClient): Promise<{ vendor: Address; delegate: Address }> {
  const vendor = (await client.readContract({
    address: CORE_ADDRESS,
    abi: coreContractAbi,
    functionName: 'vendor',
    args: [],
  })) as Address;
  const delegate = (await client.readContract({
    address: CORE_ADDRESS,
    abi: coreContractAbi,
    functionName: 'delegate',
    args: [],
  })) as Address;
  return { vendor, delegate };
}
