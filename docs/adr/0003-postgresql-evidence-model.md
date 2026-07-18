# ADR 0003: PostgreSQL Evidence Model

## Status

Accepted

## Context

Genesis Sentinel needs durable, reproducible security findings. Critical conclusions must be backed by evidence, not generated summaries.

## Decision

Use PostgreSQL with Prisma for the initial evidence model. The schema stores immutable scan evidence separately from mutable token and contract cache data.

Core records:

- `Chain`
- `Token`
- `Contract`
- `Scan`
- `ScanStage`
- `Detector`
- `DetectorResult`
- `Finding`
- `FindingEvidence`
- `RiskAssessment`
- `CategoryScore`

Supporting early records:

- `LiquidityPool`
- `HolderSnapshot`
- `SimulationRun`
- `APIKey`
- `APIUsage`
- `Watchlist`
- `WatchlistItem`
- `SecurityEvent`
- `TelegramUser`
- `TelegramChat`

Addresses are normalized to lowercase and keyed with `chainId`. Scan creation is idempotent by chain, normalized address, and hashed idempotency key.

## Consequences

- Historical findings remain explainable by scanner version, detector version, and evidence.
- Stage-level failures can be stored without discarding successful evidence from other stages.
- The initial schema is broader than Stage 2 behavior, but sparse supporting tables are included where near-term stages need durable IDs and auditability.
