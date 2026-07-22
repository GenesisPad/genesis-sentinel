/**
 * Addresses that belong to the chain or to widely-used shared protocols rather than to any one
 * token's operator.
 *
 * This exists because of a real analysis mistake: Robinhood Chain's two gas-fee collectors have
 * byte-identical code and appear in every transaction on the chain, and were briefly read as a
 * scam operator's "fee-splitter fleet". Pivoting on them would have linked essentially every
 * address on the chain to one scam. Shared bytecode among infrastructure is expected — it is a
 * template for a protocol role, not evidence of a shared operator.
 *
 * Rule of thumb when adding entries: if the address would show up in the trace of an arbitrary
 * unrelated transaction, or is used by unrelated projects across the ecosystem, it belongs here.
 */

export type ChainInfrastructureRole =
  | "GAS_FEE_COLLECTOR"
  | "SYSTEM_PRECOMPILE"
  | "ACCOUNT_ABSTRACTION"
  | "SHARED_PROTOCOL"
  | "BURN_OR_ZERO";

export interface ChainInfrastructureEntry {
  address: `0x${string}`;
  label: string;
  role: ChainInfrastructureRole;
}

/** Entries that apply on every chain (canonical cross-chain deployments and burn sinks). */
const universalInfrastructure: ChainInfrastructureEntry[] = [
  {
    address: "0x0000000000000000000000000000000000000000",
    label: "Zero address",
    role: "BURN_OR_ZERO"
  },
  {
    address: "0x000000000000000000000000000000000000dead",
    label: "Conventional burn address",
    role: "BURN_OR_ZERO"
  },
  {
    address: "0x0000000071727de22e5e9d8baf0edac6f37da032",
    label: "ERC-4337 EntryPoint v0.7",
    role: "ACCOUNT_ABSTRACTION"
  },
  {
    address: "0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789",
    label: "ERC-4337 EntryPoint v0.6",
    role: "ACCOUNT_ABSTRACTION"
  },
  {
    address: "0x000000000022d473030f116ddee9f6b43ac78ba3",
    label: "Uniswap Permit2",
    role: "SHARED_PROTOCOL"
  }
];

/**
 * Robinhood Chain (4663) is an Arbitrum Orbit chain. Its gas fee is split between the two
 * collectors below plus the ArbOS L1 pricer pool, and those three amounts sum to
 * gasUsed * gasPrice on every transaction — verified across unrelated transactions from
 * unrelated senders.
 */
const robinhoodChainInfrastructure: ChainInfrastructureEntry[] = [
  {
    address: "0x5a2b80a9b7effc06129bd5462d77bc20a8a59be7",
    label: "Robinhood Chain gas fee collector",
    role: "GAS_FEE_COLLECTOR"
  },
  {
    address: "0xbc5c3a7adecf54d34169fd90dbd1b7d3142df067",
    label: "Robinhood Chain gas fee collector",
    role: "GAS_FEE_COLLECTOR"
  },
  {
    address: "0xa4b00000000000000000000000000000000000f6",
    label: "ArbOS L1PricerFundsPool (batch-poster reimbursement)",
    role: "GAS_FEE_COLLECTOR"
  }
];

const infrastructureByChain = new Map<number, ChainInfrastructureEntry[]>([
  [4663, robinhoodChainInfrastructure]
]);

/**
 * Arbitrum/Nitro system precompiles live at 0x00..64 through 0x00..ff (ArbSys, ArbGasInfo,
 * ArbOwner, NodeInterface, and friends). Matching the range avoids having to enumerate every
 * precompile and keeps working as new ones are added.
 */
function isArbitrumPrecompile(address: string): boolean {
  const normalized = address.toLowerCase();
  if (!normalized.startsWith(`0x${"0".repeat(37)}`)) return false;
  const suffix = Number.parseInt(normalized.slice(-3), 16);
  return Number.isFinite(suffix) && suffix >= 0x064;
}

/**
 * Returns the infrastructure entry for an address, or null when the address is not known
 * infrastructure. Callers should treat a non-null result as "do not attribute this address to
 * the token's operator".
 */
export function findChainInfrastructure(
  chainId: number,
  address: `0x${string}`
): ChainInfrastructureEntry | null {
  const normalized = address.toLowerCase() as `0x${string}`;

  for (const entry of universalInfrastructure) {
    if (entry.address === normalized) return entry;
  }
  for (const entry of infrastructureByChain.get(chainId) ?? []) {
    if (entry.address === normalized) return entry;
  }
  if (isArbitrumPrecompile(normalized)) {
    return {
      address: normalized,
      label: "Arbitrum system precompile",
      role: "SYSTEM_PRECOMPILE"
    };
  }

  return null;
}

export function isChainInfrastructure(chainId: number, address: `0x${string}`): boolean {
  return findChainInfrastructure(chainId, address) !== null;
}
