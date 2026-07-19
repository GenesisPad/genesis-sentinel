export const scannerVersion = "0.1.0-foundation";

export const supportedChains = [
  {
    chainId: 4663,
    name: "Robinhood Chain",
    implemented: true
  }
] as const;

export type ScanState =
  | "QUEUED"
  | "RESOLVING_CHAIN"
  | "FETCHING_CONTRACT"
  | "ANALYZING_CONTRACT"
  | "DISCOVERING_MARKETS"
  | "ANALYZING_HOLDERS"
  | "SIMULATING_TRADES"
  | "SCORING"
  | "COMPLETED"
  | "PARTIALLY_COMPLETED"
  | "FAILED";

export type ScanStageStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "SKIPPED";

export type CheckOutcome =
  "DETECTED" | "PASSED" | "UNSUPPORTED" | "FAILED" | "INCONCLUSIVE" | "DATA_UNAVAILABLE";

export type FindingSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type FindingConfidence = "LOW" | "MEDIUM" | "HIGH";

export type RiskCategory =
  | "CONTRACT_CONTROL"
  | "TRADING_SAFETY"
  | "LIQUIDITY_SAFETY"
  | "DISTRIBUTION_RISK"
  | "REPUTATION_RISK";

export type RiskLevel =
  | "LOW"
  | "MODERATE"
  | "ELEVATED"
  | "HIGH"
  | "CRITICAL"
  | "UNABLE_TO_ASSESS";

export type OwnershipStatus = "RENOUNCED" | "ACTIVE" | "UNKNOWN";

export type EvidenceType =
  | "FUNCTION"
  | "EVENT"
  | "STORAGE"
  | "BYTECODE"
  | "TRANSACTION_TRACE"
  | "SIMULATION"
  | "HOLDER_DATA"
  | "LIQUIDITY_DATA"
  | "EXTERNAL_SOURCE";

export interface FindingEvidence {
  type: EvidenceType;
  summary: string;
  data: Record<string, unknown>;
  blockNumber?: bigint;
  transactionHash?: `0x${string}`;
  address?: `0x${string}`;
}

export interface SecurityFinding {
  code: string;
  detectorId: string;
  detectorVersion: string;
  title: string;
  severity: FindingSeverity;
  category: RiskCategory;
  confidence: FindingConfidence;
  description: string;
  technicalExplanation: string;
  evidence: FindingEvidence[];
  recommendation?: string;
}

export interface CategoryScore {
  category: RiskCategory;
  score: number;
  confidence: FindingConfidence;
  explanation?: string;
}

/**
 * A single finding's contribution to its category score, persisted so the overall score is
 * reconstructible and auditable after the fact, not just the aggregate number.
 */
export interface FindingContribution {
  code: string;
  category: RiskCategory;
  severity: FindingSeverity;
  confidence: FindingConfidence;
  weight: number;
}

export interface RiskAssessment {
  /** Null only when `level` is `UNABLE_TO_ASSESS` — never a stand-in for a low-risk score. */
  score: number | null;
  level: RiskLevel;
  confidence: FindingConfidence;
  categoryScores: CategoryScore[];
  scannerVersion: string;
  findingContributions: FindingContribution[];
  /** Evidence gaps (unsupported/unavailable/inconclusive/failed checks) that were not treated
   * as low risk. Non-empty even when a numeric score was produced, whenever some category's
   * evidence was incomplete. */
  unableToAssessReasons: string[];
}

export const riskScoreRange = {
  minimum: 0,
  maximum: 100
} as const;

export const riskScoreDirection =
  "Risk Score: 0=minimal detected risk, 100=maximum detected risk. Higher score means greater risk." as const;

export function riskLevelForScore(score: number): Exclude<RiskLevel, "UNABLE_TO_ASSESS"> {
  assertRiskScore(score);

  if (score >= 80) {
    return "CRITICAL";
  }

  if (score >= 60) {
    return "HIGH";
  }

  if (score >= 40) {
    return "ELEVATED";
  }

  if (score >= 20) {
    return "MODERATE";
  }

  return "LOW";
}

export interface ServiceHealth {
  status: "ok";
  service: string;
  version: string;
  time: string;
}

export interface ReadinessDependency {
  name: "postgres" | "redis";
  status: "ok" | "error";
  message?: string;
}

export interface ServiceReadiness {
  status: "ready" | "not_ready";
  service: string;
  version: string;
  time: string;
  dependencies: ReadinessDependency[];
}

export interface ScanProgress {
  scanId: string;
  chainId: number;
  address: `0x${string}`;
  state: ScanState;
  scannerVersion: string;
  submittedAt: string;
  message: string;
  scanBlockNumber?: string;
  completedAt?: string;
}

export interface FindingEvidenceView {
  type: EvidenceType;
  summary: string;
  data: Record<string, unknown>;
  blockNumber?: string;
  transactionHash?: `0x${string}`;
  address?: `0x${string}`;
}

export interface SecurityFindingView {
  id: string;
  code: string;
  detectorId: string;
  detectorVersion: string;
  title: string;
  severity: FindingSeverity;
  category: RiskCategory;
  confidence: FindingConfidence;
  description: string;
  technicalExplanation: string;
  evidence: FindingEvidenceView[];
  recommendation?: string;
}

export interface DetectorCheckView {
  id: string;
  detectorResultId: string;
  detectorId: string;
  detectorVersion: string;
  code: string;
  outcome: CheckOutcome;
  confidence: FindingConfidence;
  evidence: FindingEvidenceView[];
  errorMessage?: string;
}

export interface ScanResultView {
  scan: ScanProgress;
  token: TokenProfileView;
  detectorChecks: DetectorCheckView[];
  findings: SecurityFindingView[];
  liquidity: LiquiditySummaryView;
  holders: HolderSummaryView;
  simulations: SimulationRunView[];
  risk: RiskSnapshot;
}

export interface TokenProfileView {
  chainId: number;
  address: `0x${string}`;
  name?: string;
  symbol?: string;
  decimals?: number;
  totalSupply?: string;
  holderCount?: number;
  sourceVerified?: boolean;
  ownerAddress?: `0x${string}`;
  ownershipStatus?: OwnershipStatus;
  deployerAddress?: `0x${string}`;
  contractCreatedAt?: string;
  creationTxHash?: `0x${string}`;
  tokenType?: string;
  iconUrl?: string;
  reputation?: string;
  priceUsd?: string;
  marketCapUsd?: string;
  volume24hUsd?: string;
  /** Whether DexScreener reports an approved "tokenProfile" order for this token — the
   * documented meaning of its "DEX Paid" badge. Undefined when unknown. */
  dexPaid?: boolean;
  metadataUpdatedAt?: string;
}

export interface HolderSnapshotView {
  chainId: number;
  tokenAddress: `0x${string}`;
  blockNumber: string;
  holderCount?: number;
  topHolders: Record<string, unknown>;
  concentration?: Record<string, unknown>;
  createdAt: string;
}

export interface HolderSummaryView {
  status: "AVAILABLE" | "UNSUPPORTED" | "NOT_FOUND";
  snapshots: HolderSnapshotView[];
  message: string;
}

export interface LiquidityPoolView {
  chainId: number;
  tokenAddress: `0x${string}`;
  poolAddress: `0x${string}`;
  dex?: string;
  quoteTokenAddress?: `0x${string}`;
  firstObservedBlock?: string;
  lastObservedBlock?: string;
  liquidityData?: Record<string, unknown>;
}

export interface LiquiditySummaryView {
  status: "AVAILABLE" | "UNSUPPORTED" | "NOT_FOUND";
  pools: LiquidityPoolView[];
  message: string;
}

export type SimulationKind = "BUY" | "SELL" | "TRANSFER";

export interface SimulationRunView {
  id: string;
  kind: SimulationKind;
  outcome: CheckOutcome;
  blockNumber?: string;
  input: Record<string, unknown>;
  result?: Record<string, unknown>;
  revertReason?: string;
  gasUsed?: string;
  simulationTool: string;
  createdAt: string;
}

/** One row for the public "recent detections" feed — only scans with a real, persisted numeric
 * score are eligible, so an UNABLE_TO_ASSESS scan never shows up looking like a risk verdict. */
export interface RecentScanView {
  chainId: number;
  address: `0x${string}`;
  name: string | null;
  symbol: string | null;
  riskScore: number;
  riskLevel: RiskLevel;
  scannedAt: string;
}

export interface RiskSnapshot {
  chainId: number;
  address: `0x${string}`;
  scannerVersion: string;
  status: "AVAILABLE" | "UNABLE_TO_ASSESS";
  level: RiskLevel;
  score: number | null;
  confidence: FindingConfidence;
  categoryScores: CategoryScore[];
  findingContributions: FindingContribution[];
  unableToAssessReasons: string[];
  findingCounts: Record<FindingSeverity, number>;
  message: string;
}

export interface DeployerHistoryEntryView {
  chainId: number;
  tokenAddress: `0x${string}`;
  scanId: string;
  riskLevel: RiskLevel | null;
  riskScore: number | null;
  highOrCriticalFindingCount: number;
  scannedAt: string;
}

/**
 * Deployer/wallet intelligence (Milestone 6) built entirely from Sentinel's own prior scan
 * history — never an external reputation service or "known scammer" list. Absence of history
 * means no prior scans were found, not that the deployer is clean.
 */
export interface DeployerHistoryView {
  deployerAddress: `0x${string}`;
  previousTokenCount: number;
  previousHighOrCriticalCount: number;
  entries: DeployerHistoryEntryView[];
}

export interface BytecodeReuseView {
  bytecodeHash: string;
  reusedByCount: number;
  reusedByAddresses: `0x${string}`[];
}

export type RelatedWalletEdgeType =
  | "FUNDED_BY"
  | "DEPLOYED_BY"
  | "OWNED_BY"
  | "PREVIOUSLY_OWNED_BY"
  | "SHARED_BYTECODE"
  | "TRANSFERRED_SUPPLY_TO";

/**
 * A single wallet-relationship edge with its own evidence and confidence — never inferred
 * from timing coincidence alone (e.g. two wallets buying near the same time is NOT sufficient
 * evidence for an edge). Each edge names the concrete on-chain observation that produced it.
 */
export interface RelatedWalletEdge {
  type: RelatedWalletEdgeType;
  address: `0x${string}`;
  confidence: FindingConfidence;
  evidence: string;
  source: string;
  firstObservedBlock?: string;
}

export function createHealth(service: string): ServiceHealth {
  return {
    status: "ok",
    service,
    version: scannerVersion,
    time: new Date().toISOString()
  };
}

export function createScanId(
  chainId: number,
  address: `0x${string}`,
  idempotencyKey: string
): string {
  return `${chainId}:${address.toLowerCase()}:${idempotencyKey}`;
}

export function normalizeEvmAddress(address: `0x${string}`): `0x${string}` {
  return address.toLowerCase() as `0x${string}`;
}

export type ApiUsageKind =
  | "CACHED_LOOKUP"
  | "FRESH_SCAN"
  | "DEEP_SIMULATION"
  | "PROVIDER_HEAVY"
  | "FAILED_REQUEST"
  | "RATE_LIMIT_EVENT";

/** Safe API key view — never includes the hash or the plaintext secret. */
export interface ApiKeyView {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  rateLimitPerMinute: number;
  enabled: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

/** Returned exactly once, at creation time. The plaintext key is never persisted or
 * retrievable again — only its hash is stored. */
export interface ApiKeyCreatedView extends ApiKeyView {
  key: string;
}

/** SSE event types for scan progress (GET /v1/scans/:scanId/events), matching the spec's
 * required event list. Polling (GET /v1/scans/:scanId) remains a full fallback. */
export type ScanEventType =
  | "scan.queued"
  | "scan.started"
  | "scan.stage.started"
  | "scan.stage.completed"
  | "scan.stage.inconclusive"
  | "scan.partial"
  | "scan.completed"
  | "scan.failed";

export interface ScanEvent {
  type: ScanEventType;
  scanId: string;
  data: Record<string, unknown>;
  emittedAt: string;
}

export function assertRiskScore(score: number): number {
  if (
    !Number.isInteger(score) ||
    score < riskScoreRange.minimum ||
    score > riskScoreRange.maximum
  ) {
    throw new Error("Risk score must be an integer from 0 to 100.");
  }

  return score;
}

/**
 * Pools are persisted in discovery order, not by liquidity size — a token can have many
 * near-empty or unused fee-tier pools alongside its real trading pool. Picking `pools[0]`
 * blindly showed "$0 liquidity" for tokens whose largest pool wasn't discovered first (verified
 * against $CASHCAT: pool 0 held $0.0000000000000037 while its real pool held $2.7M). The pool
 * with the highest totalLiquidityUsd is the one that actually matters to a trader. Shared so the
 * web app and the Telegram bot (which reads ScanResultView.liquidity.pools independently) can't
 * drift — this exact bug existed in both surfaces before this function was extracted.
 */
export function selectPrimaryLiquidityPool(pools: LiquidityPoolView[]): LiquidityPoolView | undefined {
  return pools.reduce<LiquidityPoolView | undefined>((best, candidate) => {
    const candidateUsd = candidate.liquidityData?.totalLiquidityUsd;
    if (typeof candidateUsd !== "number") return best;
    const bestUsd = best?.liquidityData?.totalLiquidityUsd;
    return typeof bestUsd !== "number" || candidateUsd > bestUsd ? candidate : best;
  }, undefined);
}

export type LiquidityHealthTier = "low" | "medium" | "healthy";

// A fixed 10/20% threshold treats a $50K ultra-low-cap the same as a $50M mid-cap, which isn't
// how launchpad/DEX liquidity actually reads: smaller caps need deeper *relative* liquidity to
// resist sniper/whale drainage, while larger caps can be "healthy" at a much lower percentage
// because their absolute dollar depth is already large. Thresholds below follow this size-aware
// cheatsheet (quote-side USD as a % of market cap):
//   <$100K   (ultra-low-cap): low <10%,  medium 10-20%,  healthy >=20%
//   $100K-5M (low-cap):       low <5%,   medium 5-12%,   healthy >=12%
//   >=$5M    (micro/mid-cap): low <5%,   medium 5-10%,   healthy >=10%
// The cheatsheet's micro-cap ($5-6M) and mid-cap ($50-60M) brackets share identical thresholds,
// so they're merged into one ">=$5M" tier; the $100K-200K gap between its ultra-low and low-cap
// brackets is folded into the low-cap tier (the stricter/lower of the two nearby thresholds).
const LIQUIDITY_HEALTH_BRACKETS = [
  { maxMarketCapUsd: 100_000, healthyPct: 20, mediumPct: 10 },
  { maxMarketCapUsd: 5_000_000, healthyPct: 12, mediumPct: 5 },
  { maxMarketCapUsd: Infinity, healthyPct: 10, mediumPct: 5 }
] as const;

// Below this absolute dollar figure, liquidity is negligible no matter what the market cap
// ratio says — there is no market cap for which $50 of real liquidity is "fine" to trade
// against. This exists because the ratio-based brackets above require a market cap to compute
// a percentage; a token with no market cap data (e.g. a rugged/dead pool DexScreener no longer
// prices) would otherwise report a tier of null — read as neutral/unknown instead of the
// obvious red flag a near-zero dollar figure actually is. Verified against a real drained pool
// ($UHOOD): totalLiquidityUsd $0.175, no market cap data, LP 100% burned — the "LP burned" fact
// is true and irrelevant once the reserves themselves are gone via a huge sell (burning the LP
// token only prevents removeLiquidity(); it does nothing to stop a normal swap from draining
// the reserves).
export const NEGLIGIBLE_LIQUIDITY_USD = 250;

/**
 * Shared by the web app and the Telegram bot so a liquidity danger signal never exists in only
 * one surface — this exact rule was fixed once for the web (ADR 0036) and needed porting here
 * for Telegram to actually match, rather than risking the same false-safety-signal bug in a
 * second, independently-formatted surface.
 */
export function liquidityHealthTier(
  totalUsd: number,
  quoteSidePctOfMarketCap: number | null,
  marketCapUsd: number | null
): LiquidityHealthTier | null {
  if (totalUsd < NEGLIGIBLE_LIQUIDITY_USD) return "low";
  if (quoteSidePctOfMarketCap == null) return null;

  const [, , lastBracket] = LIQUIDITY_HEALTH_BRACKETS;
  const bracket =
    (marketCapUsd != null ? LIQUIDITY_HEALTH_BRACKETS.find((b) => marketCapUsd < b.maxMarketCapUsd) : undefined) ??
    lastBracket;
  if (quoteSidePctOfMarketCap >= bracket.healthyPct) return "healthy";
  if (quoteSidePctOfMarketCap >= bracket.mediumPct) return "medium";
  return "low";
}
