import type { MarketDataProvider } from "@genesis-sentinel/providers";
import { selectPrimaryLiquidityPool, type ScanResultView } from "@genesis-sentinel/shared";

export type RefreshVolatileFields = (result: ScanResultView) => Promise<ScanResultView>;

/**
 * Refreshes only the volatile, fast-changing fields of an already-persisted scan result — price,
 * market cap, 24h volume, dex-paid status, social/website links, and the primary pool's own
 * liquidity figure — via a live DexScreener lookup, while leaving every detector finding, control
 * check, holder snapshot, and simulation result exactly as persisted. This is what lets a cached
 * read stay fast and free of RPC/worker cost for the expensive parts, while still showing current
 * numbers for the parts that genuinely change minute to minute.
 *
 * Deliberately DexScreener-only, not the full explorer-then-market precedence chain a real scan
 * uses (see collectTokenProfile in apps/worker/src/scan-worker.ts) — that would mean adding a
 * second live RPC/explorer round trip to every cached read just to match a precedence order that
 * mostly agrees anyway. A single fast HTTP call is the right tradeoff for a refresh layer; the
 * full scan is still what a Rerun/fresh scan uses for the authoritative figures.
 *
 * A failed or unavailable live lookup returns the result completely unchanged — a refresh that
 * can't get fresher data is not an error, it's a no-op, never a reason to blank out or guess at
 * a number the last real scan actually measured.
 *
 * Takes a per-chain resolver rather than a single provider — every supported chain (Robinhood,
 * Arc, Stable, ...) has its own DexScreener network slug, so the right provider depends on which
 * chain the scan result is actually for. A chain with no resolvable market provider is a no-op,
 * same as a failed lookup.
 */
export function createMarketRefresher(
  getMarketProvider: (chainId: number) => MarketDataProvider | null
): RefreshVolatileFields {
  return async function refreshVolatileFields(result) {
    const market = getMarketProvider(result.token.chainId);
    if (!market) return result;

    const profile = await market
      .getMarketProfile({ chainId: result.token.chainId, address: result.token.address })
      .catch(() => null);
    if (!profile) return result;

    const refreshedToken = {
      ...result.token,
      ...(profile.priceUsd != null ? { priceUsd: profile.priceUsd } : {}),
      ...(profile.marketCapUsd != null ? { marketCapUsd: profile.marketCapUsd } : {}),
      ...(profile.volume24hUsd != null ? { volume24hUsd: profile.volume24hUsd } : {}),
      ...(profile.dexPaid != null ? { dexPaid: profile.dexPaid } : {}),
      // A project can add/update its socials or website on DexScreener at any time after
      // Sentinel's last scan — refreshed live on every cached read, same as price/market cap,
      // rather than frozen at whatever was (or wasn't) set when the token was first scanned.
      ...(profile.socials != null ? { socials: profile.socials } : {}),
      ...(profile.websites != null ? { websites: profile.websites } : {})
    };

    const primaryPool =
      profile.liquidityUsd != null ? selectPrimaryLiquidityPool(result.liquidity.pools) : undefined;
    if (!primaryPool) {
      return { ...result, token: refreshedToken };
    }

    const refreshed = {
      ...result,
      token: refreshedToken,
      liquidity: {
        ...result.liquidity,
        pools: result.liquidity.pools.map((pool) =>
          pool.poolAddress === primaryPool.poolAddress
            ? {
                ...pool,
                liquidityData: { ...pool.liquidityData, totalLiquidityUsd: profile.liquidityUsd }
              }
            : pool
        )
      }
    };
    return applyLiveLiquidityCollapse(result, refreshed, primaryPool.poolAddress, profile.liquidityUsd!);
  };
}

const LIVE_LIQUIDITY_COLLAPSE_CODE = "LIVE_LIQUIDITY_COLLAPSE";
const LIVE_LIQUIDITY_COLLAPSE_SCORE = 98;

function applyLiveLiquidityCollapse(
  persisted: ScanResultView,
  refreshed: ScanResultView,
  poolAddress: `0x${string}`,
  liveLiquidityUsd: number
): ScanResultView {
  const persistedPool = persisted.liquidity.pools.find((pool) => pool.poolAddress === poolAddress);
  const persistedLiquidityUsd = persistedPool?.liquidityData?.totalLiquidityUsd;
  if (
    typeof persistedLiquidityUsd !== "number" || !Number.isFinite(persistedLiquidityUsd) ||
    persistedLiquidityUsd < 1_000 || !Number.isFinite(liveLiquidityUsd) ||
    liveLiquidityUsd > 500 || liveLiquidityUsd > persistedLiquidityUsd * 0.1
  ) return refreshed;
  if (refreshed.findings.some((finding) => finding.code === LIVE_LIQUIDITY_COLLAPSE_CODE)) return refreshed;

  const dropPct = ((persistedLiquidityUsd - liveLiquidityUsd) / persistedLiquidityUsd) * 100;
  const finding = {
    id: `live-liquidity-collapse:${poolAddress}`,
    code: LIVE_LIQUIDITY_COLLAPSE_CODE,
    detectorId: "live-market-refresh",
    detectorVersion: "0.1.0",
    title: "Live liquidity has collapsed",
    severity: "CRITICAL" as const,
    category: "LIQUIDITY_SAFETY" as const,
    confidence: "HIGH" as const,
    description: `Live liquidity fell ${dropPct.toFixed(1)}% from $${persistedLiquidityUsd.toFixed(2)} at scan time to $${liveLiquidityUsd.toFixed(2)}.`,
    technicalExplanation: "The cached scan's primary-pool liquidity was compared with the current market value. A greater-than-90% collapse to $500 or less is treated as an active drain/rug signal, regardless of the original contract score.",
    evidence: [{
      type: "LIQUIDITY_DATA" as const,
      summary: "Current primary-pool liquidity is catastrophically below the persisted scan value.",
      address: poolAddress,
      data: { persistedLiquidityUsd, liveLiquidityUsd, dropPct }
    }],
    recommendation: "Do not trade. Treat this pool as drained until liquidity is independently restored and verified."
  };
  const contribution = {
    code: LIVE_LIQUIDITY_COLLAPSE_CODE,
    category: "LIQUIDITY_SAFETY" as const,
    severity: "CRITICAL" as const,
    confidence: "HIGH" as const,
    weight: LIVE_LIQUIDITY_COLLAPSE_SCORE
  };
  const categoryScores = refreshed.risk.categoryScores.some((category) => category.category === "LIQUIDITY_SAFETY")
    ? refreshed.risk.categoryScores.map((category) => category.category === "LIQUIDITY_SAFETY"
        ? { ...category, score: Math.max(category.score, LIVE_LIQUIDITY_COLLAPSE_SCORE), confidence: "HIGH" as const,
            explanation: "Live market refresh detected a catastrophic primary-pool liquidity collapse." }
        : category)
    : [...refreshed.risk.categoryScores, {
        category: "LIQUIDITY_SAFETY" as const,
        score: LIVE_LIQUIDITY_COLLAPSE_SCORE,
        confidence: "HIGH" as const,
        explanation: "Live market refresh detected a catastrophic primary-pool liquidity collapse."
      }];

  return {
    ...refreshed,
    findings: [...refreshed.findings, finding],
    risk: {
      ...refreshed.risk,
      status: "AVAILABLE",
      level: "CRITICAL",
      score: Math.max(refreshed.risk.score ?? 0, LIVE_LIQUIDITY_COLLAPSE_SCORE),
      confidence: "HIGH",
      categoryScores,
      findingContributions: [...refreshed.risk.findingContributions, contribution],
      findingCounts: { ...refreshed.risk.findingCounts, CRITICAL: refreshed.risk.findingCounts.CRITICAL + 1 },
      message: "Live liquidity collapse detected after the persisted scan."
    }
  };
}
