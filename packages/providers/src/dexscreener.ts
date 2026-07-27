import { NEGLIGIBLE_LIQUIDITY_USD } from "@genesis-sentinel/shared";
import {
  decimalStringValue,
  fetchJson,
  isRecord,
  numberValue,
  stringValue,
  timestampMsDateValue
} from "./http.js";
import type { MarketDataProvider, MarketProfile } from "./types.js";

export interface DexScreenerChainConfig {
  chainId: number;
  /** DexScreener's network slug for this chain, e.g. "robinhood" */
  networkSlug: string;
}

/**
 * DexScreener supplements Blockscout's explorer price/market-cap data; explorer values take
 * precedence when both are available (see collectTokenProfile in apps/worker). It has no
 * source or holder data, so it only implements MarketDataProvider.
 */
export function createDexScreenerMarketDataProvider(
  config: DexScreenerChainConfig
): MarketDataProvider {
  return {
    id: "dexscreener-market",
    supportsChain: (chainId) => chainId === config.chainId,
    async getMarketProfile({ chainId, address }) {
      if (chainId !== config.chainId) {
        return null;
      }

      const [response, dexPaid] = await Promise.all([
        fetchJson(`https://api.dexscreener.com/token-pairs/v1/${config.networkSlug}/${address}`),
        fetchDexPaidStatus(config.networkSlug, address)
      ]);
      if (!Array.isArray(response)) {
        return fetchGeckoTerminalProfile(config.networkSlug, address, dexPaid);
      }

      const pairs = response.filter(isRecord);
      if (pairs.length === 0) {
        return fetchGeckoTerminalProfile(config.networkSlug, address, dexPaid);
      }

      const normalizedAddress = address.toLowerCase();
      const matchingPairs = pairs.filter((pair) => {
        const base = isRecord(pair.baseToken) ? pair.baseToken : null;
        return stringValue(base?.address)?.toLowerCase() === normalizedAddress;
      });
      const bestPair = selectBestPair(matchingPairs.length > 0 ? matchingPairs : pairs);
      if (!bestPair) {
        return fetchGeckoTerminalProfile(config.networkSlug, address, dexPaid);
      }

      const baseToken = isRecord(bestPair.baseToken) ? bestPair.baseToken : {};
      const info = isRecord(bestPair.info) ? bestPair.info : {};
      const volume = isRecord(bestPair.volume) ? bestPair.volume : {};
      const liquidity = isRecord(bestPair.liquidity) ? bestPair.liquidity : {};
      const labels = Array.isArray(bestPair.labels)
        ? bestPair.labels.filter((label): label is string => typeof label === "string").join(", ")
        : null;

      const profile: MarketProfile = {
        name: stringValue(baseToken.name),
        symbol: stringValue(baseToken.symbol),
        iconUrl: stringValue(info.imageUrl),
        labels,
        priceUsd: decimalStringValue(bestPair.priceUsd),
        marketCapUsd: decimalStringValue(bestPair.marketCap) ?? decimalStringValue(bestPair.fdv),
        volume24hUsd: decimalStringValue(volume.h24),
        liquidityUsd: numberValue(liquidity.usd),
        pairCreatedAt: timestampMsDateValue(bestPair.pairCreatedAt),
        dexPaid
      };

      return profile;
    }
  };
}

/**
 * Robinhood pairs can be indexed by GeckoTerminal before DexScreener exposes them. Fall back
 * for volatile market fields when DexScreener returns no pair, while keeping the scanner's
 * stronger direct on-chain liquidity measurement.
 */
async function fetchGeckoTerminalProfile(
  networkSlug: string,
  address: string,
  dexPaid: boolean | null
): Promise<MarketProfile | null> {
  const response = await fetchJson(
    `https://api.geckoterminal.com/api/v2/networks/${networkSlug}/tokens/${address}`
  ).catch(() => null);
  if (!isRecord(response) || !isRecord(response.data)) return null;

  const attributes = isRecord(response.data.attributes) ? response.data.attributes : null;
  if (!attributes) return null;

  const volume = isRecord(attributes.volume_usd) ? attributes.volume_usd : {};
  return {
    name: stringValue(attributes.name),
    symbol: stringValue(attributes.symbol),
    iconUrl: stringValue(attributes.image_url),
    labels: null,
    priceUsd: decimalStringValue(attributes.price_usd),
    marketCapUsd:
      decimalStringValue(attributes.market_cap_usd) ?? decimalStringValue(attributes.fdv_usd),
    volume24hUsd: decimalStringValue(volume.h24),
    liquidityUsd: null,
    pairCreatedAt: null,
    dexPaid
  };
}

/**
 * DexScreener's "DEX Paid" badge means the token has an approved "tokenProfile" (enhanced token
 * info) order — checked via the same endpoint DexScreener's own site uses
 * (https://api.dexscreener.com/orders/v1/{chainId}/{tokenAddress}), not part of the documented
 * public API reference but stable and live-verified. Returns null (not false) on any fetch
 * failure — an unknown paid status is never reported as "not paid".
 */
async function fetchDexPaidStatus(networkSlug: string, address: string): Promise<boolean | null> {
  const response = await fetchJson(
    `https://api.dexscreener.com/orders/v1/${networkSlug}/${address}`
  ).catch(() => null);
  if (!isRecord(response) || !Array.isArray(response.orders)) {
    return null;
  }

  return response.orders.some(
    (order) => isRecord(order) && order.type === "tokenProfile" && order.status === "approved"
  );
}

function pairPriceUsd(pair: Record<string, unknown>): number | null {
  const price = numberValue(pair.priceUsd);
  return price !== null && price > 0 ? price : null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const midValue = sorted[mid];
  if (midValue === undefined) return null;
  if (sorted.length % 2 !== 0) return midValue;
  const prevValue = sorted[mid - 1];
  return prevValue === undefined ? midValue : (prevValue + midValue) / 2;
}

function pairLiquidityUsd(pair: Record<string, unknown>): number {
  return numberValue(isRecord(pair.liquidity) ? pair.liquidity.usd : undefined) ?? 0;
}

/**
 * A single manipulated pool can report a wildly implausible price and a fabricated
 * multi-billion-dollar liquidity figure to game naive "highest liquidity" selection — seen live
 * for a real Robinhood-chain token where one rogue pair reported priceUsd ~6.36e26 alongside
 * $1.27B of liquidity while every other pair agreed on ~$0.03. Since genuine pools for the same
 * token largely agree on price, an outlier more than 10x away from the median price across all
 * pairs is dropped before ranking by liquidity, rather than trusting liquidity figures alone.
 *
 * Live-verified failure mode of that same filter, on a different token: several near-empty
 * "dust" pools (each under $1 of real liquidity, one or two lifetime trades) reported prices
 * wildly different from the token's one genuinely liquid, actively-traded $45k pool — a dead
 * pool's quoted price is close to meaningless, barely any trade volume moved it anywhere. With
 * three dust pools outnumbering the single real pool, they dominated the median, and the real
 * pool's *correct* price got discarded as the "outlier" instead, leaving a $0.05 dust pool
 * picked as "best". The median reference price is now computed only from pairs with at least
 * $NEGLIGIBLE_LIQUIDITY_USD of liquidity behind them — a price with no real liquidity backing it
 * shouldn't get a vote in "what's the real price" — falling back to every pair only if none has
 * meaningful liquidity at all. The plausibility filter itself still applies to every pair.
 */
function selectBestPair(pairs: Record<string, unknown>[]): Record<string, unknown> | null {
  const pairsWithMeaningfulLiquidity = pairs.filter(
    (pair) => pairLiquidityUsd(pair) >= NEGLIGIBLE_LIQUIDITY_USD
  );
  const pricingReferencePairs =
    pairsWithMeaningfulLiquidity.length > 0 ? pairsWithMeaningfulLiquidity : pairs;
  const prices = pricingReferencePairs
    .map(pairPriceUsd)
    .filter((price): price is number => price !== null);
  const medianPrice = median(prices);

  const plausiblePairs =
    medianPrice === null
      ? pairs
      : pairs.filter((pair) => {
          const price = pairPriceUsd(pair);
          return price === null || (price <= medianPrice * 10 && price >= medianPrice / 10);
        });
  const candidates = plausiblePairs.length > 0 ? plausiblePairs : pairs;

  const sorted = [...candidates].sort((a, b) => pairLiquidityUsd(b) - pairLiquidityUsd(a));
  return sorted[0] ?? null;
}
