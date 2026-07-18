# Holder Analysis Foundation

Stage 10 defines the holder-analysis boundary without pretending Genesis Sentinel has a live holder index.

## Current Behavior

- The worker records `ANALYZING_HOLDERS` for each scan.
- The stage is marked `SKIPPED` with sanitized metadata when no holder source is configured.
- Public scan results include a `holders` summary.
- Persisted `HolderSnapshot` rows are mapped into results when they exist.

An empty holder summary means holder analysis is unsupported for that scan. It does not mean the token has healthy distribution, no whale risk, no contract-controlled holders, or low concentration.

## Future Sources

Holder snapshots should come from one of these bounded sources:

- A chain-specific holder index.
- A bounded `Transfer` log scanner with explicit block and time limits.
- A cached third-party snapshot source with source metadata and freshness timestamps.

## Production Requirements

Before holder concentration can affect scoring, snapshots need:

- Block number and freshness metadata.
- Top holder balances and percentages.
- Known burn, pool, treasury, bridge, and exchange labels.
- Contract-wallet and owner-controlled holder signals where available.
- Clear failure modes for incomplete history, pruned RPCs, or rate-limited sources.
