# ADR 0030: Token Page Freshness, Deployer Attribution, and Report Corrections

## Status

Accepted. Responds to a batch of user-reported issues from live scan reports for `$GEN`,
`$CRASHCAT`, and `$TRSG`: a high/low risk mismatch between the homepage and token page for the
same token, an empty "Top risks" section despite real findings existing, a wrong deployer
address, a buy simulation that always fails, GenesisPad-launch evidence rendered as if it were a
risk, no liquidity health signal, no wallet-clustering signal in holder analysis, and a
non-functional Explore page.

## Context and root causes

**The token page was pinned forever to the first scan ever run for an address.**
`apps/web/src/lib/api.ts`'s `getTokenReport` called `createScan({ address, chainId })` with no
`fresh` flag, which builds a *deterministic* idempotency key (`web:${chainId}:${address}`, no
timestamp). `ScanRepository.createOrGetQueuedScan` looks up scans by the exact
`(chainId, targetAddress, idempotencyKeyHash)` tuple and returns the existing row verbatim if
found — by design, for legitimate request-deduplication reasons. But since every non-"rerun"
page load reuses the same key, this meant the *very first* scan for a token became the
permanent, unchanging "canonical" result for that address's page — regardless of how many times
the underlying data changed or the fix history behind it. "Rerun scan" *did* correctly create a
fresh scan and reactively update the page for that browser session (`useTokenReport`'s
`freshScanId` state), but a page reload, new tab, or shared link reverted straight back to the
original stale scan. This is why `$GEN` showed "Low Risk / 0 findings" on the token page while
`GET /v1/risk` and `GET /v1/tokens/.../findings` (which correctly resolve "latest scan for this
token", not a frozen scanId) showed HIGH/60 with two real findings — and why re-running
`$CRASHCAT` after ADR 0028's source-scoping fix still showed the old false `SOURCE_*` findings
on a fresh page load: the fix was real and deployed, but the page was never looking at the fixed
scan's output at all.

**The reported "deployer" was a generic CREATE2 factory contract, not the launcher's wallet.**
Blockscout's `creator_address_hash` — the value `packages/providers/src/blockscout.ts` maps to
`deployerAddress` — is whichever address's `CREATE`/`CREATE2` opcode directly spawned the
contract's bytecode. Verified live for `$GEN`
(`0xb84622564b131ce0950ebb35713801619bfddc9c`): Blockscout reports its creator as
`0x17dA64D619235F5FD708258615F6a08CBca6AA94`, and that address is itself a contract named
`Create2Factory`. For any GenesisPad-launched token, this will always be true — the real
question ("who actually launched this token") is answered on-chain by
`GenesisLaunchRegistry.LaunchRecord.originalCreator`
(`C:\Projects\genesispad\contracts\src\GenesisLaunchRegistry.sol`), which Genesis Sentinel
already reads via `GenesisPadLaunchProvider.getLaunchInfo` (used by `genesispadLaunchDetector`)
but never used to correct the displayed/tracked deployer.

**The static buy pre-check always failed, regardless of the token.** `staticCallRouterNativeBuy`
(`apps/worker/src/scan-worker.ts`) probes the V2 router with `from: sentinelStaticCallWallet`, a
synthetic address that holds no real native currency. Verified directly against the production
RPC: this call reverts with "the total cost (gas * gas fee + value) ... exceeds the balance of
the account" for *any* token, because the probe wallet is broke, not because of anything the
token does. This surfaced on the report page as a raw, misleading "Buy simulation: Failed" with
a low-level EVM error string shown verbatim.

**`GENESISPAD_CONFIRMED_LAUNCH` (INFO, positive evidence) was rendered in "Top risks" with a
warning triangle.** `TopRisks` (`apps/web/src/components/token-report-view.tsx`) sorted and
displayed the top 3 findings by severity with no floor — an `INFO`-only finding set still filled
the "most serious first" risk callout, using the same `AlertTriangle` icon as an actual
`CRITICAL` finding, just recolored blue. This is what produced the screenshot the user
flagged: liquidity-locked evidence styled to look like a risk.

**Liquidity health, wallet-clustering, and Explore had no signal wired at all** — not bugs,
gaps: `LiquidityInfo` had no health-tier field, `HolderInfo.clusteredWithDeployer` existed in the
type but nothing ever populated it (Milestone 6's `relatedWalletPct`/`RELATED_WALLET` labels from
ADR 0027 were never threaded into the web layer), and `/explore` was a literal placeholder
("Wire this to GET /v1/scans/recent") — the backend didn't have that endpoint yet.

## Decision

- Added `ScanRepository.getLatestScanResult(chainId, address)` (reuses the existing
  `findLatestTokenScan` helper `getTokenFindings`/`getRiskSnapshot` already relied on) and a new
  `GET /v1/tokens/:chainId/:address` endpoint. `getTokenReport` now calls this first and only
  falls back to `createScan` (first-ever visit) on a 404 — the token page now always reflects
  the token's current state, and "Rerun scan" is the only way a *new* scan gets created, exactly
  as intended.
- `apps/worker/src/scan-worker.ts`: after `genesispadLaunch` is resolved, `originalCreator` (when
  present and different from the explorer's raw deployer) becomes the `effectiveDeployerAddress`
  used everywhere downstream — the `DEPLOYED_BY` wallet-clustering edge, deployer-history lookup,
  and holder-concentration context — and `recordTokenProfile` is re-called to correct the
  persisted value so the displayed "Deployer" field is right too.
- `packages/chain-adapters/src/index.ts`: `TraceCallInput` gained a `stateOverride` field, passed
  through to viem's `client.call`. `staticCallRouterNativeBuy` now overrides
  `sentinelStaticCallWallet`'s balance for the duration of the probe call only (never a real
  transaction) — verified against the live RPC that this turns the always-failing call into a
  real pass/fail signal.
- `TopRisks` now filters out `INFO`-severity findings before ranking — evidence like a confirmed
  GenesisPad launch is not a risk and no longer appears in the risk callout.
- Added liquidity health classification (`apps/web/src/lib/adapt.ts`): quote-side USD value (half
  of `totalLiquidityUsd`, which is already computed as quote-side-times-two) as a percentage of
  market cap — `<10%` low, `10-20%` medium, `>20%` healthy — shown on `LiquidityCard`.
- Wired `HolderInfo.clusteredWithDeployer` from the `RELATED_WALLET` labels ADR 0027 already adds
  to persisted top-holder rows — the existing (previously dead) UI for this now shows real data.
- Built a working Explore page: `ScanRepository.getRecentScans(limit)` (most recent scan per
  token, newest first, restricted to scans with a real persisted numeric score so
  `UNABLE_TO_ASSESS` scans never masquerade as a risk verdict), a `GET /v1/scans/recent`
  endpoint, and a real `apps/web/src/components/explore-view.tsx` consuming it — this also
  activates the homepage's pre-existing "Recent security detections" widget, which was ready but
  had nothing to call.
- Rerun UX: the homepage's result view (`apps/web/src/components/result-summary.tsx`) gained a
  second "Rerun scan" button near the top identity/score card (previously only shown inside the
  "cached scan" banner, which only appears for actual cache hits, and at the bottom). The token
  page (`token-report-view.tsx`) now renders the same staged `<ScanProgress>` component the
  homepage uses for a first-time scan while a rerun is in flight, instead of a bare spinner —
  matching, not duplicating, the homepage's existing animation.

## Consequences

- `ScanRepository`'s interface gained two required methods (`getLatestScanResult`,
  `getRecentScans`); all test doubles implementing it were updated.
- No Prisma schema change was required for any of this.
- Full verification (`pnpm lint`, `typecheck`, `test`, `build`, `prisma:validate`) passed clean
  across all 19 workspace packages.
- Existing scans created before this fix keep whatever deployer address and findings they were
  scored with — this project does not rewrite historical `RiskAssessment`/`Token` rows. Once
  deployed, the token page will show the current state of the *latest* scan for a token
  immediately (no rescan needed for that part), but a stale deployer address on an old scan row
  needs a fresh scan to pick up the `originalCreator` correction.
- Deferred, not attempted: a visual/interactive wallet-clustering "bubble map" graph — this ADR
  only wires the underlying data (`clusteredWithDeployer` count) into the existing holder-
  concentration card; a real network/bubble visualization is a separate, larger data-viz
  component. A broader "impeccable" design polish pass across the token/scan pages, requested
  alongside these fixes, was not done in this slice — these were correctness and missing-feature
  fixes, not a visual redesign.
