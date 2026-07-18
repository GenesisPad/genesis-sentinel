import {
  createBlockscoutExplorerProvider,
  createBlockscoutHolderProvider,
  createBlockscoutSourceProvider,
  type BlockscoutChainConfig
} from "./blockscout.js";
import { createDexScreenerMarketDataProvider } from "./dexscreener.js";
import { createRobinhoodLiquidityProvider, robinhoodChainId } from "./robinhood-liquidity.js";
import type { ProviderSet } from "./types.js";

const robinhoodBlockscoutConfig: BlockscoutChainConfig = {
  chainId: robinhoodChainId,
  apiBaseUrl: "https://robinhoodchain.blockscout.com/api/v2",
  legacyApiBaseUrl: "https://robinhoodchain.blockscout.com/api"
};

/**
 * Chain-keyed provider registry. Each supported chain gets one ProviderSet combining
 * source/explorer/holder/liquidity/market providers; worker orchestration looks up a
 * chain's set once per scan instead of branching on adapter name. Unsupported chains
 * return null and callers fall back to the explicit UNSUPPORTED/UNAVAILABLE results from
 * @genesis-sentinel/security-engine.
 *
 * See docs/architecture/providers.md for the fallback order this registry documents.
 */
export function createProviderRegistry(): { getProviderSet(chainId: number): ProviderSet | null } {
  const sets = new Map<number, ProviderSet>();

  const robinhoodExplorer = createBlockscoutExplorerProvider(robinhoodBlockscoutConfig);
  sets.set(robinhoodChainId, {
    source: createBlockscoutSourceProvider(robinhoodBlockscoutConfig),
    explorer: robinhoodExplorer,
    market: createDexScreenerMarketDataProvider({
      chainId: robinhoodChainId,
      networkSlug: "robinhood"
    }),
    holder: createBlockscoutHolderProvider(robinhoodBlockscoutConfig),
    liquidity: createRobinhoodLiquidityProvider((address) =>
      robinhoodExplorer.getTokenPriceUsd({ chainId: robinhoodChainId, address })
    )
  });

  return {
    getProviderSet(chainId: number): ProviderSet | null {
      return sets.get(chainId) ?? null;
    }
  };
}

const defaultRegistry = createProviderRegistry();

/** Convenience accessor using the module-level default registry. */
export function getProviderSet(chainId: number): ProviderSet | null {
  return defaultRegistry.getProviderSet(chainId);
}
