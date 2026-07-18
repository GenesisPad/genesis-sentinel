export type ChainId = "ethereum" | "bnb" | "base" | "robinhood";

export interface ChainMeta {
  id: ChainId;
  /** Numeric EVM chain id, used by viem / explorer lookups. */
  chainId: number;
  label: string;
  shortLabel: string;
  /** Accent dot color (hex). */
  color: string;
  /** Native currency symbol. */
  symbol: string;
  explorerUrl: string;
  /** Hostnames that identify this chain when parsing an explorer/DEX URL. */
  urlHosts: string[];
}

export const CHAINS: Record<ChainId, ChainMeta> = {
  robinhood: {
    id: "robinhood",
    // Real Robinhood Chain mainnet id — the only chain the API currently implements.
    chainId: 4663,
    label: "Robinhood Chain",
    shortLabel: "Robinhood",
    color: "#b4f11f",
    symbol: "ETH",
    explorerUrl: "https://robinhoodchain.blockscout.com",
    urlHosts: ["robinhoodchain.blockscout.com"],
  },
  ethereum: {
    id: "ethereum",
    chainId: 1,
    label: "Ethereum",
    shortLabel: "Ethereum",
    color: "#6ea8ff",
    symbol: "ETH",
    explorerUrl: "https://etherscan.io",
    urlHosts: ["etherscan.io"],
  },
  base: {
    id: "base",
    chainId: 8453,
    label: "Base",
    shortLabel: "Base",
    color: "#3f7fff",
    symbol: "ETH",
    explorerUrl: "https://basescan.org",
    urlHosts: ["basescan.org"],
  },
  bnb: {
    id: "bnb",
    chainId: 56,
    label: "BNB Chain",
    shortLabel: "BNB",
    color: "#f5c518",
    symbol: "BNB",
    explorerUrl: "https://bscscan.com",
    urlHosts: ["bscscan.com"],
  },
};

// Only Robinhood Chain is implemented by the API today (packages/shared supportedChains).
// Ethereum/Base/BNB stay in CHAINS for future use but are intentionally excluded here so
// the UI never lets someone submit a scan the backend will reject.
export const SUPPORTED_CHAINS: ChainMeta[] = [CHAINS.robinhood];

export const CHAIN_IDS = Object.keys(CHAINS) as ChainId[];

export function isSupportedChain(id: string): id is ChainId {
  return id in CHAINS;
}

export function chainByNumericId(numericId: number): ChainMeta | undefined {
  return SUPPORTED_CHAINS.find((c) => c.chainId === numericId);
}
