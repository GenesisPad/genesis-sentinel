# ADR 0006: BullMQ Scan Orchestration

## Status

Accepted

## Context

Scan requests must not perform expensive chain reads inside API request handling. Scan creation also needs idempotency so duplicate user requests do not create uncontrolled jobs.

## Decision

Use BullMQ for scan orchestration. The API creates a durable scan record first, then enqueues a scan job only when that record was newly created. The BullMQ job ID is the scan ID, so repeated enqueue attempts collapse naturally.

Stage 4 workers execute only foundational evidence-gathering stages:

- resolve chain block
- fetch contract bytecode
- persist scan block metadata
- persist stage statuses and sanitized errors

The scan is marked `PARTIALLY_COMPLETED` after these stages because detectors and scoring are not implemented yet.

## Consequences

- API latency stays bounded.
- Job idempotency is enforced both in PostgreSQL and BullMQ.
- Stage failures are persisted before jobs fail.
- Failed jobs remain in Redis for inspection.
- Stage 5 can attach detectors to the existing worker flow without changing public API scan creation semantics.
