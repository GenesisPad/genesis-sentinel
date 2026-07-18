# Domain Model

Stage 2 separates three kinds of data:

- Immutable scan evidence: findings, finding evidence, detector results, simulation runs, holder snapshots, and risk assessments.
- Mutable cache state: token metadata and contract metadata that may be refreshed as new blocks are scanned.
- Operational state: scan lifecycle records, stage status, API usage, watchlists, and security events.

## Address Identity

All EVM addresses are normalized to lowercase before persistence. Every address uniqueness constraint includes `chainId`.

## Scan Identity

Scan creation is idempotent by `(chainId, targetAddress, idempotencyKeyHash)`. The raw idempotency key is not stored. The API derives a scan ID from chain ID, normalized address, and the hashed idempotency key.

## Evidence

Findings are only meaningful with evidence. `FindingEvidence` records store evidence type, summary, JSON data, optional block number, optional transaction hash, and optional address. Chain-derived records must include block numbers whenever the source can provide them.

## Versioning

Scans store `scannerVersion`. Findings and detector results store detector ID and detector version. Risk assessments store `scoringVersion`.

## Deferred Fields

The schema includes initial tables for liquidity, holders, simulations, API keys, usage, watchlists, security events, Telegram users, and Telegram chats. These are intentionally sparse until their implementing stages fill in exact behavior.
