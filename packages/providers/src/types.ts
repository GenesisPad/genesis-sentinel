import type { ChainAdapter } from "@genesis-sentinel/chain-adapters";
import type { ContractSourceDetectorInput } from "@genesis-sentinel/security-engine";

/**
 * Provider-neutral domain contracts for the evidence lookups a scan needs beyond raw RPC
 * access: contract source, explorer token profile, holder data, liquidity discovery, and
 * market profile. Concrete providers (Blockscout, DexScreener, on-chain DEX discovery, and
 * future Etherscan-compatible/Sourcify providers) implement these interfaces so worker
 * orchestration never has to branch on a specific vendor or chain adapter name.
 *
 * See docs/architecture/providers.md for the fallback order used per domain.
 */

export type ContractSourceResult = ContractSourceDetectorInput;

export interface SourceProvider {
  readonly id: string;
  supportsChain(chainId: number): boolean;
  getContractSource(input: {
    chainId: number;
    address: `0x${string}`;
  }): Promise<ContractSourceResult>;
}

export interface ExplorerTokenProfile {
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  totalSupply: string | null;
  holderCount: number | null;
  sourceVerified: boolean | null;
  deployerAddress: `0x${string}` | null;
  contractCreatedAt: Date | null;
  creationTxHash: `0x${string}` | null;
  tokenType: string | null;
  iconUrl: string | null;
  reputation: string | null;
  priceUsd: string | null;
  marketCapUsd: string | null;
  volume24hUsd: string | null;
}

export interface ExplorerProvider {
  readonly id: string;
  supportsChain(chainId: number): boolean;
  getTokenProfile(input: {
    chainId: number;
    address: `0x${string}`;
  }): Promise<ExplorerTokenProfile | null>;
  getTokenPriceUsd(input: { chainId: number; address: `0x${string}` }): Promise<number | null>;
}

export interface MarketProfile {
  name: string | null;
  symbol: string | null;
  iconUrl: string | null;
  labels: string | null;
  priceUsd: string | null;
  marketCapUsd: string | null;
  volume24hUsd: string | null;
  liquidityUsd: number | null;
  pairCreatedAt: Date | null;
}

export interface MarketDataProvider {
  readonly id: string;
  supportsChain(chainId: number): boolean;
  getMarketProfile(input: {
    chainId: number;
    address: `0x${string}`;
  }): Promise<MarketProfile | null>;
}

export interface EnrichedHolder {
  address: `0x${string}`;
  balanceRaw: string;
  isContract: boolean;
  labels: string[];
  totalSupplyPct: number;
}

export interface HolderConcentration extends Record<string, unknown> {
  top1Pct: number;
  top5Pct: number;
  top10Pct: number;
  top1Address: `0x${string}` | null;
  deployerPct: number | null;
  ownerPct: number | null;
  liquidityPoolPct: number;
  burnedPct: number;
  excludedContractPct: number;
  suspiciousFlags: string[];
}

export interface HolderSnapshotResult {
  holderCount: number | null;
  topHolders: EnrichedHolder[];
  concentration: HolderConcentration;
}

export interface HolderProviderContext {
  holderCount?: number | null;
  deployerAddress?: `0x${string}` | null;
  ownerAddress?: `0x${string}` | null;
  liquidityPoolAddresses?: `0x${string}`[];
}

export interface HolderProvider {
  readonly id: string;
  supportsChain(chainId: number): boolean;
  getHolderSnapshot(input: {
    chainId: number;
    address: `0x${string}`;
    totalSupply: string | null;
    context?: HolderProviderContext;
  }): Promise<HolderSnapshotResult | null>;
}

export interface DiscoveredPool {
  poolAddress: `0x${string}`;
  dex: string;
  quoteTokenAddress: `0x${string}`;
  quoteSymbol: string;
  quoteDecimals: number;
  liquidityData: Record<string, unknown>;
}

export interface LiquidityProviderCoverage {
  discoveryTool: string;
  checkedDexes: string[];
  checkedQuoteSymbols: string[];
}

export interface LiquidityProvider {
  readonly id: string;
  supportsChain(chainId: number): boolean;
  describeCoverage(): LiquidityProviderCoverage;
  discoverPools(input: {
    adapter: ChainAdapter;
    chainId: number;
    tokenAddress: `0x${string}`;
    blockNumber: bigint;
  }): Promise<DiscoveredPool[]>;
}

export interface ProviderSet {
  source: SourceProvider;
  explorer: ExplorerProvider;
  market: MarketDataProvider;
  holder: HolderProvider;
  liquidity: LiquidityProvider;
}
