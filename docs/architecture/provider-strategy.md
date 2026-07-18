# Provider Strategy

This document covers the Milestone 1 source-verification provider strategy specifically.
For the broader explorer/market/holder/liquidity provider layer, see
`docs/architecture/providers.md`.

## ContractSourceProvider

`packages/providers/src/types.ts` defines the granular per-vendor capability interface:

```ts
interface ContractSourceProvider {
  readonly id: string;
  supports(chainId: number): boolean;
  getVerification(input): Promise<ContractVerificationResult>;
  getSource(input): Promise<VerifiedContractSource | null>;
  getAbi(input): Promise<unknown[] | null>;
  getImplementation?(input): Promise<ProxyImplementationResult | null>;
}
```

Each vendor implements this directly. `createContractSourceChain` (in
`contract-source-chain.ts`) composes an ordered list of these into the single `SourceProvider`
worker orchestration actually calls (`getContractSource`), so vendor order and vendor count
are entirely internal to `packages/providers` — adding a provider never touches
`apps/worker/src/scan-worker.ts`.

## Current providers and order

For Robinhood Chain (4663), `packages/providers/src/registry.ts` wires, in order:

1. **Sourcify** (`sourcify.ts`) — Sourcify's v2 contract-lookup API. Chain-scoped via an
   explicit `supportedChainIds` allowlist (currently empty for Robinhood Chain, since Sourcify
   does not index this appchain). Listed first per Milestone 1's requirement and so that any
   chain Sourcify does index is preferred automatically once added to the allowlist — no rate
   limits, free, and community-maintained.
2. **Blockscout** (`blockscout.ts`) — the Robinhood Chain Blockscout instance's legacy
   Etherscan-compatible `getsourcecode` endpoint for verification/source/ABI, plus the v2
   `/smart-contracts/{address}` endpoint for proxy implementation detection. This is the only
   provider that currently covers Robinhood Chain in practice.

`createContractSourceChain` tries providers in this order and returns the first genuinely
`VERIFIED` result with non-empty source. A provider returning `UNAVAILABLE` (unsupported
chain, timeout, malformed response, rate limit) is skipped in favor of the next provider —
this is the "graceful fallback to bytecode-only analysis" Milestone 1 requires. An
`UNVERIFIED` result (a provider successfully checked and found nothing) is kept only as a
last-resort fallback if every other provider is `UNAVAILABLE`; a later provider's `VERIFIED`
result always wins over an earlier `UNVERIFIED` one.

A third category — **generic Etherscan-compatible explorers** — is deliberately not wired yet
because Robinhood Chain is the only chain configured today and Blockscout already covers it.
Adding an Etherscan-compatible chain is a new `ContractSourceProvider` implementation plus one
line in the registry; the interface and composition logic already support it.

## Caching

`createCachedContractSourceProvider` (`cache.ts`) wraps a provider's `getVerification` with an
in-memory cache keyed by `chainId:address:bytecodeHash:providerId:cacheVersion`. Including the
runtime bytecode hash in the key means a contract upgrade (different bytecode) naturally
misses the cache instead of serving a stale verification result; bumping
`sourceVerificationCacheVersion` invalidates every cached entry at once. `getSource`/`getAbi`/
`getImplementation` are not cached yet — known limitation, deferred since the verification
check already gates whether source/ABI are fetched at all.

The cache is in-memory and per-process today; a shared Redis-backed cache would be needed for
multi-worker deployments to get cross-process hit rates, and is deferred to production
hardening (Milestone 11).

## Proxy detection

`getImplementation` is optional on the interface because not every vendor reports it. Only
Blockscout implements it today, reading the `implementations` array from
`/smart-contracts/{address}`. The result's `proxyPattern` is currently always `"UNKNOWN"` —
Blockscout does not report which specific proxy standard (EIP-1967, UUPS, Beacon, minimal) is
in use, only the resolved implementation address, so Sentinel does not claim to know the
pattern rather than guessing.

## Known limitations

- Sourcify's allowlist is empty until a chain it actually indexes is added.
- No mismatched-bytecode detector consumes `bytecodeMatches` yet — it is threaded through
  `ContractVerificationResult` for a future detector/finding (see Milestone 2), but
  `sourceCodeRiskDetector` in `packages/security-engine` does not yet read it.
- Cache is process-local; restarting the worker clears it.
- No generic Etherscan-compatible provider implementation exists yet, only the interface
  contract it would need to satisfy.
