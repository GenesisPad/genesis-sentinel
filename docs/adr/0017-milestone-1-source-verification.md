# ADR 0017: Milestone 1 Source-Verification Providers

## Status

Accepted.

## Context

ADR 0016 introduced a chain-neutral `SourceProvider` interface with a single
`getContractSource(chainId, address)` call, backed only by Blockscout. Milestone 1's spec
calls for something more specific: a granular per-vendor `ContractSourceProvider` interface
(`supports`, `getVerification`, `getSource`, `getAbi`, optional `getImplementation`), at least
two initial providers (Sourcify and Blockscout, with room for generic Etherscan-compatible
explorers), a configurable provider order, and caching keyed by chain id, address, runtime
bytecode hash, provider, and verification version.

## Decision

Added `ContractSourceProvider` (the granular vendor-facing interface) alongside the existing
`SourceProvider` (the aggregate interface worker orchestration calls) in
`packages/providers/src/types.ts`. Implemented:

- `createSourcifyContractSourceProvider` (`sourcify.ts`) — Sourcify v2 API, chain-scoped via an
  explicit allowlist since Sourcify does not index every chain (Robinhood Chain's allowlist is
  currently empty — a real, documented limitation, not a bug).
- `createBlockscoutContractSourceProvider` (`blockscout.ts`, replacing the old
  `createBlockscoutSourceProvider`) — same legacy `getsourcecode` data as before, plus a new
  `getImplementation` reading Blockscout's `/smart-contracts/{address}` `implementations` array
  for proxy detection.
- `createContractSourceChain` (`contract-source-chain.ts`) — composes an ordered list of
  `ContractSourceProvider`s into the `SourceProvider` worker orchestration already calls, so
  `apps/worker/src/scan-worker.ts` needed zero changes. Tries providers in order; the first
  `VERIFIED` result with non-empty source wins; `UNAVAILABLE` providers are skipped;
  `UNVERIFIED` is kept only as a last-resort fallback.
- `createCachedContractSourceProvider` (`cache.ts`) — wraps `getVerification` with an
  in-memory cache keyed by `chainId:address:bytecodeHash:providerId:cacheVersion`, so a
  contract upgrade (different bytecode hash) or a version bump naturally invalidates stale
  results.

`packages/providers/src/registry.ts` now builds Robinhood Chain's `source` provider as
`createContractSourceChain([cachedSourcify, cachedBlockscout])`.

## Consequences

- Adding a new source-verification vendor (or wiring a chain into Sourcify's allowlist) is a
  change scoped entirely to `packages/providers`; worker orchestration and the
  `sourceCodeRiskDetector` consumer contract are unaffected.
- `ContractVerificationResult.bytecodeMatches` is threaded through from vendors that report it
  (Sourcify's `runtimeMatch`) but nothing consumes it yet — no detector currently flags a
  mismatched-bytecode result differently from a plain unverified one. Deferred to Milestone 2.
- The verification cache is in-memory and per-process; it does not survive a worker restart and
  is not shared across worker instances. A Redis-backed cache is deferred to Milestone 11
  (production hardening).
- `getSource`/`getAbi`/`getImplementation` are not cached, only `getVerification` — acceptable
  because verification status is what gates whether the more expensive source/ABI fetch happens
  at all.
- Tests cover: verified single-file, verified multi-file, unverified/malformed, proxy detection,
  provider timeout/network error, rate limit (429), not-found (404), mismatched bytecode,
  composite fallback ordering, and cache hit/invalidation on bytecode-hash change.
