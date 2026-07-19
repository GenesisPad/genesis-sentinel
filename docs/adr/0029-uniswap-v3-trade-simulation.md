# ADR 0029: Uniswap V3 Trade Simulation, Honeypot Reporting Fix, Production Enablement

## Status

Accepted. Follow-up to a user report that a scan's report page showed no honeypot status, buy/sell
tax, or trade-simulation evidence at all for `$TRSG` (a token launched via GenesisPad's current
direct-Uniswap-V3 model). Investigation found three separate, real gaps stacked on top of each
other, all now fixed.

## Context

Milestone 5 (real trade simulation) was built entirely against Uniswap V2: `getReserves()`
constant-product math, the V2 router's `swapExactETHForTokensSupportingFeeOnTransferTokens`, and
a V2-pair-shaped static `eth_call`. GenesisPad's current launch model
(`docs/adr/0021-real-genesis-locker-and-genesispad-registry.md`, `direct-v3-stack.json`,
`"launchModel": "DIRECT_UNISWAP_V3"`) produces only Uniswap V3 pools. The consequence, found by
tracing a real production scan end-to-end:

1. `createRobinhoodRouteTradeSimulations` (`apps/worker/src/scan-worker.ts`) filtered pool
   candidates to `protocol === "UNISWAP_V2"` only. For a V3-only token this left `pool`
   undefined, and the function returned fully `UNSUPPORTED` for BUY/SELL/TRANSFER regardless of
   whether the fork simulator was even enabled — **every current GenesisPad token got zero
   trade-simulation evidence**, not a partial result.
2. Even for tokens where simulation results were available (or the route-quote tier's fallback
   signal), `apps/web/src/lib/adapt.ts`'s `mapSimulations` hardcoded `isHoneypot: null`
   unconditionally and never read `buyTaxBps`/`sellTaxBps`/`transferTaxBps` out of the
   simulation result at all — so the report page would never have shown a honeypot verdict or
   tax figures even once real data existed.
3. `SIMULATION_FORK_ENABLED` was `false` in the production `.env.production` on Contabo, so the
   real (non-route-quote) Ganache fork simulator never ran at all in production, for any pool
   protocol.

## Decision

**Web mapping fix** (`apps/web/src/lib/adapt.ts`): `mapSimulations` now reads `isHoneypot` from
the SELL leg's result (falling back to the BUY leg's), and `buyTaxBps`/`sellTaxBps`/
`transferTaxBps` from each leg's `result` record, instead of hardcoding `null`/omitting them.
Added `numberFromResult`/`boolFromResult` helpers and two regression tests in
`apps/web/src/lib/adapt.test.ts`.

**Uniswap V3 route-quote tier** (`apps/worker/src/scan-worker.ts`): pool selection now considers
both `UNISWAP_V2` and `UNISWAP_V3` pools (still via `selectDeepestPool`'s existing
USD-liquidity-first sort, which already worked across protocols). For a V3 pool, expected
buy/sell output is approximated from the pool's live `sqrtPriceX96` spot price (new
`getV3SpotAmountOut`, Q192 fixed-point math) instead of constant-product reserves, since V3 pools
have no `getReserves()`-shaped reserves at all. The V2-router-specific static buy `eth_call` is
honestly marked `SKIPPED` for V3 (no static pre-check reason to fabricate one) rather than
silently reused or dropped. The V2/V3-agnostic sell-leg static transfer check
(`staticCallSellLegTransfer`, a plain ERC20 `transfer()` probe) needed no change — it never
depended on pool protocol.

**Uniswap V3 fork simulation** (`apps/worker/src/fork-simulator.ts`): added a real V3 swap path
using the verified `SwapRouter02` contract at `0xcaf681a66d020601342297493863e78c959e5cb2` —
confirmed by reading `GenesisProtocolConfig.swapRouter()` live on Robinhood Chain
(`0x4C8a488f3C1139B189AFF60cac97787BCe9684F2`) and cross-checked against Blockscout, which
reports the address as a verified contract named `SwapRouter02`, never an assumed/copied address.
The V3 buy path wraps native currency into WETH (`WETH.deposit()`) then calls
`exactInputSingle`; the V3 sell path approves the router and calls `exactInputSingle` in the
reverse direction, at the pool's own fee tier (`ForkTradeSimulatorInput` gained `dex`/`feeTier`
fields, threaded from the caller). `runSellTest` (already shared between the partial-sell and
full-sell steps) branches on `input.dex` to pick V2 vs. V3 execution; the wallet-to-wallet
transfer test and all balance-delta/tax-percentage measurement logic is unchanged and protocol-
agnostic. `expectedV3SellOut` mirrors `expectedSellOutAfterBuy` using the pool's live post-buy
`slot0()` price instead of `getReserves()`.

**Production enablement** (`.github/workflows/deploy-contabo.yml`): `.env.production` lives on
the Contabo server and is only ever created once by this script — later deploys don't touch
existing keys. Added an idempotent step (runs on every deploy) that sets
`SIMULATION_FORK_ENABLED=true` in the existing file if present with a different value, or appends
it if missing, so this doesn't silently drift back to disabled on a future deploy. Also updated
the first-run template default from `false` to `true` for any future fresh server bring-up.
Enabling this means the worker will spin up a real (ephemeral, non-broadcast) Ganache fork per
eligible scan — real CPU/memory/disk cost per scan, torn down immediately after — which is why
this was a deliberate, explicit decision rather than bundled silently into an unrelated change.

## Consequences

- Updated one existing worker test (`apps/worker/src/scan-worker.test.ts`) whose name and
  assertions documented the *old*, now-fixed V3-is-`UNSUPPORTED` limitation as expected
  behavior; it now asserts the real route-quote-tier `PASSED` outcome for a V3 pool fixture.
- No Prisma schema change — `dex`/`feeTier` ride the existing `Record<string, unknown>`
  `SimulationRunView.input`/`result` shape, same as every other simulation field.
- Full verification (`pnpm lint`, `typecheck`, `test`, `build`, `prisma:validate`) passed clean
  across all 19 workspace packages.
- No dedicated fork-integration test exists for the new V3 swap path, consistent with the
  pre-existing precedent that `fork-simulator.ts` has zero direct unit tests for its V2 path
  either (it requires a live RPC fork, unsuited to the fast unit-test suite) — coverage for the
  route-quote tier (which does exercise the real V3 spot-price math) lives in
  `scan-worker.test.ts`.
- Deferred, not attempted: Uniswap V4 pools (still fully `UNSUPPORTED`); a V3-specific static
  buy-leg `eth_call` pre-check (V3 tokens rely entirely on the fork simulator for a real
  pass/fail buy signal when the fork simulator is unavailable); multi-trade-size/multi-sender
  testing beyond the existing single-size-plus-partial-sell sequence.
