# ADR 0020: Milestone 3 (Partial) — LP-Locker Abstraction and Honest LP Ownership Boundaries

## Status

Accepted. Milestone 3 covers real pool discovery (already largely implemented for Robinhood
Chain across V2/V3/V4 prior to this session), V2/V3 LP ownership determination, and locker
integration. This ADR covers the LP-ownership/locker slice specifically, not the full milestone.

## Context

Milestone 3 requires distinguishing burned LP, locked LP, unknown LP ownership, and (for V3)
per-position ownership — and explicitly forbids trusting a website/explorer label claiming LP is
"locked" without verifying it against an actual locker contract. The existing Uniswap V2
discovery (`packages/providers/src/robinhood-liquidity.ts`) only ever measured burn-address
balances (`lpBurnedOrLockedPct`) — a real, verifiable signal — but had no path to verify an
actual third-party lock, and no interface existed for one.

Genesis Locker's contract addresses and lock-record ABI are not available/verified in this
codebase. Fabricating an address to "complete" locker integration would be worse than leaving it
unsupported — it would risk reporting fabricated lock data for real tokens.

## Decision

Added `packages/providers/src/locker.ts`: a `LockerProvider` interface
(`supportsChain`/`getLockStatus`) and `createUnsupportedLockerProvider()`, the only
implementation today. `ProviderSet` gained a `locker` field. `createRobinhoodLiquidityProvider`
now takes a `LockerProvider` and calls `getLockStatus({chainId, lpTokenAddress: pairAddress})`
for every discovered V2 pool, attaching the result as `lockStatus` in `liquidityData` — always
`{status: "UNSUPPORTED", reason: "..."}` today, additive alongside the pre-existing
`lpBurnedOrLockedPct` field (which was left unchanged, since it is real, already-verified
evidence and already consumed downstream by `apps/web/src/lib/adapt.ts` and
`apps/api/src/telegram.ts` with an accurate caveat comment already in place).

Also documented, rather than implemented, that V3 position-level (NFT) ownership is out of scope
until Robinhood Chain's Uniswap V3 `NonfungiblePositionManager` address is verified — for the
same "don't fabricate an address" reason as the locker.

## Consequences

- `createRobinhoodLiquidityProvider`'s signature changed (added a required `LockerProvider`
  parameter); its only call site (`registry.ts`) was updated. No other package calls it directly.
- `lockStatus` is purely additive to `DiscoveredPool.liquidityData` — no existing consumer
  (web, Telegram, database) was changed, and none currently reads the new field. Wiring
  `lockStatus` into the web/Telegram LP display is deferred, tracked as open Milestone 3/10 work,
  not silently dropped.
- Milestone 3 remains incomplete: V3 position ownership, GenesisPad-graduated token discovery,
  and NoXa pool discovery are not implemented (no verified contract data available for any of
  them in this codebase).
