export type ChainId = "ethereum" | "bnb" | "base" | "robinhood" | "arc" | "stable";

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
    chainId: 4663,
    label: "Robinhood Chain",
    shortLabel: "Robinhood",
    color: "#b4f11f",
    symbol: "ETH",
    explorerUrl: "https://robinhoodchain.blockscout.com",
    urlHosts: ["robinhoodchain.blockscout.com"],
  },
  arc: {
    id: "arc",
    chainId: 5042,
    label: "Arc Chain",
    shortLabel: "Arc",
    color: "#5b8def",
    symbol: "USDC",
    explorerUrl: "https://arcscan.io",
    urlHosts: ["arcscan.io"],
  },
  stable: {
    id: "stable",
    chainId: 988,
    label: "Stable Chain",
    shortLabel: "Stable",
    color: "#00c9a7",
    symbol: "USDT0",
    explorerUrl: "https://stablescan.xyz",
    urlHosts: ["stablescan.xyz"],
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

// Chains actively implemented by the API (packages/shared supportedChains).
// Ethereum/Base/BNB stay in CHAINS for future use but are intentionally excluded here so
// the UI never lets someone submit a scan the backend will reject.
export const SUPPORTED_CHAINS: ChainMeta[] = [CHAINS.robinhood, CHAINS.arc, CHAINS.stable];

export const CHAIN_IDS = Object.keys(CHAINS) as ChainId[];

export function isSupportedChain(id: string): id is ChainId {
  return id in CHAINS;
}

export function chainByNumericId(numericId: number): ChainMeta | undefined {
  return SUPPORTED_CHAINS.find((c) => c.chainId === numericId);
}
