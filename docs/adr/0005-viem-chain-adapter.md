# ADR 0005: viem Chain Adapter

## Status

Accepted

## Context

Genesis Sentinel needs EVM chain access without leaking client-library details into detectors, scan orchestration, API responses, or database code.

## Decision

Use `viem` inside `packages/chain-adapters` and expose a provider-neutral `ChainAdapter` interface.

Robinhood Chain is the first chain configuration. The adapter resolves RPC URLs from validated environment variables and only uses the public default RPC when explicitly allowed. This avoids silently depending on a rate-limited public endpoint in production.

## Consequences

- Detectors can depend on a stable project-owned interface.
- Additional EVM chains can reuse the viem adapter with new chain configuration.
- RPC timeout, fallback, and provider-degradation policy can be centralized.
- Features such as traces and explorer lookups can be added without changing every detector.
