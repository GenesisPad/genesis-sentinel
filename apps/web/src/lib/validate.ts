import { getAddress, isAddress } from "viem";
import { CHAINS, SUPPORTED_CHAINS, type ChainId } from "./chains";

export type InputKind =
  | "empty"
  | "typing"
  | "address"
  | "explorer-url"
  | "dex-url"
  | "unsupported-url"
  | "invalid";

export interface ParsedInput {
  kind: InputKind;
  /** Checksummed address when resolvable. */
  address?: string;
  /** Chain detected from an explorer/DEX URL, if any. */
  chainId?: ChainId;
  raw: string;
}

const ADDRESS_RE = /0x[a-fA-F0-9]{40}/;

/** Validate an EVM address with viem and return its checksummed form. */
export function normalizeAddress(value: string): string | null {
  const trimmed = value.trim();
  if (!isAddress(trimmed)) return null;
  return getAddress(trimmed);
}

function detectChainFromHost(host: string): ChainId | undefined {
  const h = host.toLowerCase();
  for (const chain of SUPPORTED_CHAINS) {
    if (chain.urlHosts.some((u) => h.includes(u))) return chain.id;
  }
  return undefined;
}

/**
 * Parse whatever the user pasted: a raw address, an explorer contract/address URL,
 * or a DEX Screener token/pair URL. Never guesses a chain silently — it only
 * *suggests* a chain when the URL host identifies one.
 */
export function parseInput(value: string): ParsedInput {
  const raw = value.trim();
  if (!raw) return { kind: "empty", raw };

  // Raw address (possibly with surrounding text stripped by the address regex).
  const direct = normalizeAddress(raw);
  if (direct) return { kind: "address", address: direct, raw };

  // URL handling
  if (/^https?:\/\//i.test(raw)) {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return { kind: "unsupported-url", raw };
    }
    const host = url.hostname;
    const match = raw.match(ADDRESS_RE);
    const address = match ? normalizeAddress(match[0]) ?? undefined : undefined;

    if (host.includes("dexscreener.com")) {
      const chainId = detectChainFromHost(url.pathname) ?? undefined;
      return { kind: "dex-url", address, chainId, raw };
    }
    const explorerChain = detectChainFromHost(host);
    if (explorerChain && address) {
      return { kind: "explorer-url", address, chainId: explorerChain, raw };
    }
    if (explorerChain && !address) {
      return { kind: "unsupported-url", chainId: explorerChain, raw };
    }
    return { kind: "unsupported-url", raw };
  }

  // Looks like a partial hex address → still typing / invalid.
  if (/^0x[a-fA-F0-9]{1,39}$/.test(raw)) return { kind: "typing", raw };
  return { kind: "invalid", raw };
}

export function isSupportedChainId(id: string | undefined): id is ChainId {
  return !!id && id in CHAINS;
}
