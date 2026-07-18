# ADR 0016: Provider Abstraction Layer

## Status

Accepted.

## Context

Milestone 0's audit (`docs/audits/current-implementation-audit.md`) found that contract
source, explorer token profile, market data, holder snapshots, and liquidity discovery were
all implemented directly inside `apps/worker/src/scan-worker.ts`, gated by string checks like
`adapter.name === "Robinhood Chain"`. This made the worker orchestration file the owner of
vendor-specific HTTP integration details (Blockscout, DexScreener, Uniswap V2/V3/V4 factory
addresses) and made it impossible to add a second chain or a fallback source provider without
editing orchestration logic directly.

## Decision

Introduced `packages/providers` (`@genesis-sentinel/providers`) with five provider-neutral
interfaces — `SourceProvider`, `ExplorerProvider`, `MarketDataProvider`, `HolderProvider`,
`LiquidityProvider` — each exposing `supportsChain(chainId)`. A chain-keyed registry
(`getProviderSet(chainId)`) returns a `ProviderSet` or `null`.

All Blockscout, DexScreener, and Robinhood Uniswap V2/V3/V4 discovery logic that previously
lived in `scan-worker.ts` moved into `packages/providers/src/{blockscout,dexscreener,
robinhood-liquidity}.ts` unchanged in behavior. `apps/worker/src/scan-worker.ts` now resolves
`const providers = getProviderSet(target.chainId)` once per scan and calls through the
interfaces; every prior `adapter.name === "Robinhood Chain"` branch was replaced with a
`providers ? ... : ...` check. See `docs/architecture/providers.md` for the fallback order per
domain and the current chain wiring.

Trade-and-route simulation (`createRobinhoodRouteTradeSimulations` and its static-call helpers)
stayed in `scan-worker.ts` for this change — it consumes `DiscoveredPool`/`HolderSnapshotResult`
from the new package but is out of scope here; see the separate simulation-expansion work.

## Consequences

- Worker orchestration no longer contains any vendor name or URL; it only depends on the
  `ProviderSet` interface and the explicit `UNSUPPORTED`/`UNAVAILABLE` fallbacks already
  provided by `@genesis-sentinel/security-engine`.
- Adding a new chain or a fallback source provider (e.g. Sourcify, an Etherscan-compatible API)
  is now a change scoped to `packages/providers`, not to scan orchestration.
- `apps/worker/src/scan-worker.test.ts` previously used a fake adapter `name` (e.g. `"Mock
  Chain"`) at `chainId: 4663` to exercise the "no live integration" path; that is no longer
  meaningful once provider selection is chain-id based. The test that covered the unsupported
  path now uses a genuinely unregistered chain id (`1`) instead of chain id `4663` with a
  decoy adapter name.
- Provider price lookups, holder concentration math, and Uniswap pool discovery are unchanged
  in behavior — this was a structural move, not a rewrite of evidence semantics.
