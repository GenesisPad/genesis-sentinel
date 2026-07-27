# ADR 0042: Score Negligible Liquidity, Unlocked LP, and Measured Tax

## Status

Accepted. Responds to a live scan the user flagged as clearly wrong: `HOOD4663`
(`0x499dc58539ba6869ee15b6c2a3c3c07f1ac4995f`) has $0.27 in total discovered pool liquidity
against a $5.48k market cap — a pool too small for a real-sized position to ever be sold back out
— yet scored 5/100 "LOW RISK", because its tiny-probe-amount buy/sell simulation passed cleanly.

## Context and root causes

Three real, user-visible risk signals were computed and shown in the report UI but never
converted into a `SecurityFinding`, so none of them could affect the score at all:

**Negligible liquidity.** ADR 0036 fixed `$uhood`'s Quick Answers tone/color for a $0.18 pool but
explicitly scoped the fix to the UI layer only — it never created a finding. `totalLiquidityUsd`
is computed per-pool during discovery (`robinhood-liquidity.ts`) but nothing downstream read it
into `scoreFindings`. A passing buy/sell simulation for a fixed small probe amount says nothing
about whether a real-sized position is exitable; `HOOD4663` is the live proof.

**LP not locked or burned.** `lpLockedAnswer` (quick-answers.tsx) reads `lpBurnedOrLockedPct`
(measured directly from LP-token burn-address balances plus any confirmed locker contract
balance) and colors the answer red when unlocked — again UI-only. The only `LIQUIDITY_SAFETY`
findings that exist (`POOL_RESERVE_DESYNC*`, `TOKEN_POOL_CONTROL_SURFACE`) are unrelated to
lock/burn status. A deployer holding 100% of an unlocked LP token on a real, sizeable pool scored
no differently than one with genuinely locked liquidity.

**Measured tax.** `buyTaxBps`/`sellTaxBps` are real fork-simulation measurements (fork-simulator.ts),
shown directly in the report and color-coded in `quick-answers.tsx`'s `taxTone`. The only
tax-related finding, `SOURCE_TAX_OR_LIMIT_CONTROL`, matches a mutable tax-*setter* function in
source at a fixed `MEDIUM` regardless of the actual rate, and never fires at all for a hardcoded
(no-setter) tax of any size. A token measured at e.g. 45% sell tax contributed nothing.

## Decision

Three new detector functions in `apps/worker/src/scan-worker.ts`, run alongside the existing
honeypot detector (same stage, same `holderDetectorResults` list feeding `scoreFindings`):

- `createNegligibleLiquidityDetectorResult`: sums `totalLiquidityUsd` across every discovered
  pool (not just the one selected for simulation) and, if below the existing `$250`
  `NEGLIGIBLE_LIQUIDITY_USD` floor (`packages/shared`, ADR 0036), emits one `CRITICAL`
  `LIQUIDITY_SAFETY` finding. Silent (no finding) when no pool could be priced at all, so a
  pricing gap is never read as "liquidity is fine."
- `createLpLockDetectorResult`: for Uniswap V2 pools only (V3/V4 liquidity isn't a
  burnable/lockable LP token in this codebase's model — correctly silent there, not a false
  "unlocked" flag), takes the best-protected pool's `lpBurnedOrLockedPct` and emits `HIGH`
  (0% protected) or `MEDIUM` (<50%) `LIQUIDITY_SAFETY`. Skipped entirely when the deepest V2 pool
  is itself below the negligible floor — nothing meaningful left to protect.
- `createTaxDetectorResult`: reads `buyTaxBps`/`sellTaxBps` off the simulation results and emits
  `CRITICAL` (≥50%), `HIGH` (≥20%), or `MEDIUM` (≥5%) `TRADING_SAFETY`, mirroring the report UI's
  own `taxTone` thresholds so a "bad"-colored tax always shows up in the score too.

## Consequences

- `pnpm lint`, `typecheck`, and the full test suite (346 tests) pass clean. Three new regression
  tests in `apps/worker/src/scan-worker.test.ts` reproduce each scenario: a negligible-liquidity
  pool with a passing simulation (asserts `risk:CRITICAL:*`), an unlocked LP token on a
  non-negligible pool, and a 45%-measured-sell-tax fork result.
- Known remaining gap, not addressed here: Uniswap V4 pools don't yet get a `totalLiquidityUsd`
  figure at all (V4 has no simple reserves to price from a balance read), so a V4-only token's
  liquidity still can't trigger the negligible-liquidity finding. Computing it would require
  Uniswap's liquidity-to-amounts tick-range math; left as a follow-up rather than risking a wrong
  dollar figure driving a score.
- Ratio-based liquidity tiers (thin liquidity relative to market cap, above the absolute $250
  floor) remain UI-only (`liquidityHealthTier`'s "low"/"medium" brackets) — only the absolute-
  dollar floor was scored here, since it's the simpler, more robust signal (works even when
  market cap is unavailable).

## Addendum: `HOOD4663`'s actual root cause was a different bug entirely

Verifying this fix live against `HOOD4663` after deploy turned up something important: its
**real** on-chain liquidity is ~$45k (`/v1/scans/:id/result`'s raw, unrefreshed pool data:
`totalLiquidityUsd: 36727.92` computed directly from live reserves), not $0.27/$0.05 as
originally reported. My new `negligible-liquidity` detector correctly stayed silent — that
liquidity genuinely isn't negligible, so the LOW score for *this specific token* was actually
close to right, and the three scoring gaps above, while real and worth fixing, weren't what was
wrong with this exact example.

The $0.05/$0.27 figure the user saw was itself a bug, in
`packages/providers/src/dexscreener.ts`'s `selectBestPair`. `HOOD4663` has one actively-traded
$45k V3 pool plus three near-empty V4 "dust" pools (each under $1 of liquidity, one or two
lifetime trades). `selectBestPair`'s outlier defense (added for a different, real incident — one
rogue pair reporting a fabricated multi-billion-dollar price/liquidity) computed a median
reference price across *all* pairs equally, with no regard for how much liquidity backed each
quoted price. With three meaningless dust-pool prices outnumbering the one real pool, the median
skewed toward the dust pools, and the real pool's *correct* price got discarded as the "outlier"
— leaving only dust pools as "plausible," and the highest-liquidity dust pool ($0.05) picked as
"best." This is the actual number the report showed and the actual number `market-refresh.ts`
was overwriting the accurate on-chain figure with on every cached read.

Fixed in the same commit: the median reference price is now computed only from pairs with at
least `NEGLIGIBLE_LIQUIDITY_USD` ($250) of liquidity behind them — a price with no real liquidity
backing it shouldn't get a vote in "what's the real price" — falling back to every pair only if
none has meaningful liquidity at all. The plausibility filter itself still applies to every pair,
so the original rogue-pair defense this replaced is unchanged for that case (new regression test
in `dexscreener.test.ts` confirms both scenarios independently).
