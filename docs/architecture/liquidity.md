# Liquidity Discovery Architecture

Stage 9 introduced the liquidity discovery boundary. Robinhood Chain now executes live, cheap
on-chain discovery across Uniswap V3, V4, and V2 pools.

The discovery code itself now lives behind the `LiquidityProvider` interface in
`@genesis-sentinel/providers` (`packages/providers/src/robinhood-liquidity.ts`) rather than in
`apps/worker/src/scan-worker.ts` directly — see `docs/architecture/providers.md` for the
provider abstraction and how a second chain or DEX would be added.

The worker records `DISCOVERING_MARKETS` as a scan stage. For Robinhood Chain it checks configured
quote tokens against:

- Uniswap V3 factory `getPool(token, quote, fee)` across common fee tiers.
- Uniswap V4 PoolManager `Initialize` logs, then StateView `getSlot0`/`getLiquidity`.
- Uniswap V2 factory `getPair(token, quote)`.

Scan results include a liquidity summary:

- `UNSUPPORTED`: discovery was not executed.
- `AVAILABLE`: persisted liquidity pools exist for the scanned token.
- `NOT_FOUND`: reserved for future live discovery that successfully searched and found no pools.

Discovery still must not interpret missing pool records as proof of no liquidity. It may miss pools
from unconfigured quote tokens, unknown factories, RPC log limits, or non-standard DEX deployments.

V3 and V4 pools are persisted as liquidity evidence but are not treated as V2 reserves for route
quote simulation. V2 pools continue to feed the V2 router/static/fork simulation path. V4 pools do
not have standalone pool contract addresses, so the database stores a deterministic address-shaped
identifier derived from the pool id and persists the real `poolId` plus `poolManagerAddress` inside
`liquidityData`.

## LP ownership classification (Milestone 3)

Uniswap V2 pool discovery (`discoverUniswapV2Pool` in
`packages/providers/src/robinhood-liquidity.ts`) reports two distinct, separately-sourced
signals in `liquidityData` — they are never merged into one claim:

- `lpBurnedOrLockedPct` — verified by summing LP-token balances at known burn/dead addresses
  directly on-chain. This is real, checkable evidence.
- `lockStatus` — the result of a provider-neutral `LockerProvider.getLockStatus()` call (see
  `packages/providers/src/locker.ts`). No concrete locker is wired for any chain today (Genesis
  Locker's contract addresses/lock-record ABI are not yet available/verified in this codebase),
  so this always reports `{ status: "UNSUPPORTED", reason: "..." }`. It is never inferred from
  the burn percentage or from an explorer/website label — per the project rule "do not trust a
  website label saying 'locked.'" When Genesis Locker's contracts are available, implement
  `LockerProvider` against them and register it in `packages/providers/src/registry.ts`; no
  other code changes are needed.

V3 liquidity positions are NFT-based (Uniswap's `NonfungiblePositionManager`), and per-position
ownership/tick-range/in-range status is **not implemented**. Robinhood Chain's
`NonfungiblePositionManager` address has not been verified in this codebase, and the project
rule against fabricating unverified contract addresses applies here the same as for V4:
implementing V3 position-level ownership against a guessed address would be worse than not
implementing it. Current V3 discovery only reports pool-level liquidity (see
`discoverUniswapV3Pool`), not position ownership; treat any future work here as a distinct,
explicitly-scoped addition once the position manager address is verified.

Future liquidity discovery should:

- Prefer bounded on-chain factory/event scanners for known DEX factories on the target chain.
- Use strict block-range and time limits, then cache discovered pools in `LiquidityPool`.
- Pin pool discovery evidence to the scan block where possible.
- Identify DEX, pool address, quote token, and discovery source.
- Persist reserve/liquidity data as evidence with units and block number.
- Add LP ownership and lock checks separately.
- Add V3/V4 quoter-based swap simulation separately instead of reusing V2 constant-product math.
- Feed liquidity findings into a new scoring version rather than changing historical Stage 7 scores.

This is the cheapest credible path because it avoids paid APIs and keeps evidence explainable. It requires known factory addresses and may miss pools from unknown or non-standard DEX deployments until those factories are configured.
