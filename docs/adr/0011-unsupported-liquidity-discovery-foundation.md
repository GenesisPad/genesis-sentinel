# ADR 0011: Unsupported Liquidity Discovery Foundation

## Status

Accepted.

## Context

Genesis Sentinel must eventually discover liquidity pools and evaluate liquidity safety, but no DEX factory, subgraph, explorer API, or curated market source is configured yet. The product must not claim that liquidity is absent or safe merely because discovery has not been implemented.

The database already includes `LiquidityPool`, so future discovered pools can be persisted without changing the public result shape.

## Decision

Stage 9 adds an explicit `DISCOVERING_MARKETS` stage. Until real market discovery exists, the worker records this stage as `SKIPPED` with metadata from an unsupported liquidity discovery result.

Scan results include a liquidity summary. If no pools are persisted, the summary reports `UNSUPPORTED` and explains that discovery is not configured.

## Consequences

- Public interfaces expose missing liquidity coverage clearly.
- Future persisted `LiquidityPool` rows can appear in scan results without redesigning API/web contracts.
- No LP ownership, lock, reserve, or depth conclusions are inferred in Stage 9.
- Future liquidity findings should use a new scoring version before affecting overall risk.
