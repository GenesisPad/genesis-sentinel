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
