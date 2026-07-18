# ADR 0023: Milestone 5 (Partial) — Wallet Transfer and Partial-Sell Fork Tests

## Status

Accepted. Milestone 5 is flagged as a priority milestone in the original spec and describes a
large test matrix (multiple trade sizes, multiple sender addresses, router-specific paths,
repeat/delayed sell, full trace capture). This ADR covers a meaningful but partial upgrade to
the existing Ganache-fork buy/sell simulator, not the full milestone.

## Context

`apps/worker/src/fork-simulator.ts` already ran a genuine, non-broadcast buy-then-full-sell
sequence against a Ganache fork of the real chain, pinned to the scan block — a solid
foundation predating this session. It was missing two capabilities the spec explicitly calls
out: wallet-to-wallet transfer testing, and testing a small sell before a large one (to
distinguish "small sell passes, large sell fails" from a flat honeypot). The `TRANSFER`
`SimulationResult` was permanently hardcoded to `DATA_UNAVAILABLE` even when a fork ran,
because the code had no funded wallet to test a transfer from — but the fork buyer *is* a
funded wallet once the buy step completes.

## Decision

Reworked `runGanacheForkTradeSimulation` to run, within one fork session:

1. Buy (unchanged behavior).
2. A wallet-to-wallet transfer test (~10% of the bought tokens to a second, freshly generated
   fork-only account via `viem/accounts`' `generatePrivateKey()` — never funded, never reused
   outside the fork).
3. A partial sell test (~10% of the remaining tokens).
4. A full/remainder sell (the rest) — this remains the primary result surfaced via the
   existing `sellTaxBps`/`sellQuoteReceivedRaw`/`canSell`/`isHoneypot` fields, so no downstream
   consumer of those fields needed to change.

Each step is independently try/caught so one failing step (e.g. a blacklisted transfer) doesn't
abort the rest — `transferSucceeded`/`partialSellSucceeded` are recorded per-step. Gas usage
(`buyGasUsed`, `sellGasUsed`) is now captured from transaction receipts.

`apps/worker/src/scan-worker.ts`'s `createRobinhoodRouteTradeSimulations` now builds a real
`TRANSFER` `SimulationResult` (`PASSED`/`FAILED` with a real `transferTaxBps`) whenever the fork
ran, instead of the permanent `DATA_UNAVAILABLE` placeholder.

## Consequences

- `ForkTradeSimulatorResult` gained new optional fields (`buyGasUsed`, `sellGasUsed`,
  `partialSellSucceeded`, `partialSellTaxBps`, `transferSucceeded`, `transferTaxBps`,
  `transferTxHash`) — additive, no existing field changed shape.
- viem's `writeContract` required an explicit `account`/`chain: null` on calls made from inside
  the new helper functions (`runTransferTest`/`runSellTest`) — passing the wallet client through
  a loosely-typed `ReturnType<typeof createWalletClient>` parameter loses the type-level
  guarantee that lets `writeContract` infer them from the bound client, unlike the original
  single-scope implementation.
- Still not implemented: multiple trade sizes beyond the fixed native amount / 10%-90% sell
  split, multiple sender addresses, router-specific path variants, repeat sell, delayed sell,
  full state/trace capture, and the full deterministic fork-fixture test suite (fee-on-transfer,
  mutable-tax, blacklist, max-wallet, trading-disabled, dynamic-tax, proxy, router-restricted
  tokens) Milestone 5 calls for. No dedicated automated test exists for `fork-simulator.ts`
  itself (requires a live RPC fork, unsuited to the fast unit-test suite) — same as before this
  change.
