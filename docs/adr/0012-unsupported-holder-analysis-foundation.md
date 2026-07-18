# ADR 0012: Unsupported Holder Analysis Foundation

## Status

Accepted

## Context

Holder concentration is important for token-risk analysis, but calculating it reliably is not free. Direct RPC calls cannot list all token holders. Accurate snapshots require an index, bounded historical `Transfer` log reconstruction, a trusted cached source, or a third-party API.

Genesis Sentinel should avoid expensive dependencies at this stage and must not imply that missing holder data means ownership is safe or distributed.

## Decision

Stage 10 adds an explicit `ANALYZING_HOLDERS` worker stage and public holder summary. Until a holder source is configured, the stage is recorded as `SKIPPED` and the scan result reports `UNSUPPORTED`.

Persisted `HolderSnapshot` records can already be rendered by the API and web UI, which lets a future holder source plug into the existing result contract.

## Consequences

- The product remains honest about unsupported holder analysis.
- Early deployments can avoid paid holder APIs.
- Risk scoring cannot use holder concentration until real snapshots are generated and validated.
- Future work can add a cheap bounded scanner or cached source without changing public result shape.
