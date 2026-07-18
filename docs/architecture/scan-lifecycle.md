# Scan Lifecycle

Initial scan states:

- `QUEUED`
- `RESOLVING_CHAIN`
- `FETCHING_CONTRACT`
- `ANALYZING_CONTRACT`
- `DISCOVERING_MARKETS`
- `ANALYZING_HOLDERS`
- `SIMULATING_TRADES`
- `SCORING`
- `COMPLETED`
- `PARTIALLY_COMPLETED`
- `FAILED`

Each scan stage must persist its own status, start time, end time, and sanitized error details. A scan may partially complete when one data source fails but other evidence remains valid.

Check outcomes:

- `DETECTED`
- `PASSED`
- `UNSUPPORTED`
- `FAILED`
- `INCONCLUSIVE`
- `DATA_UNAVAILABLE`

Stage 2 formalizes these as shared TypeScript contracts and database records. `ScanStage` records hold stage-level status, timestamps, sanitized errors, and metadata. `Scan` records hold the overall state and may finish as `PARTIALLY_COMPLETED` when some stages succeed and others fail or are unsupported.

Stage 4 adds BullMQ orchestration. New scans are enqueued by the API only when a durable scan record is newly created. Duplicate idempotency requests return the existing scan without creating another job.

The Stage 4 worker currently executes:

- `RESOLVING_CHAIN`: captures scan block number, block timestamp, and block hash.
- `FETCHING_CONTRACT`: captures bytecode presence and stores contract observation metadata.

Stage 5 adds `ANALYZING_CONTRACT` for the first detector set. The worker still marks the scan `PARTIALLY_COMPLETED` because scoring, simulation, liquidity, and holder analysis are not implemented yet.

Stage 6 adds read interfaces over the persisted lifecycle:

- `GET /v1/scans/:scanId` returns progress.
- `GET /v1/scans/:scanId/result` returns progress, findings, evidence, and risk status.
- `GET /v1/risk/:chainId/:address` returns the latest persisted risk snapshot for a token.
- Web and Telegram scan submission use the same API application service and idempotent queue path.

When no `RiskAssessment` exists, Stage 6 reports `UNABLE_TO_VERIFY` and a null score. It does not treat missing scoring as low risk.

Stage 7 adds the `SCORING` worker stage after `ANALYZING_CONTRACT`.

- If detector findings exist, the worker persists a versioned `RiskAssessment` and `CategoryScore` records.
- If no detector findings exist, the worker marks `SCORING` as `SKIPPED` and public interfaces continue to report `UNABLE_TO_VERIFY`.
- The scan remains `PARTIALLY_COMPLETED` because simulations, liquidity discovery, holder analysis, and source verification are still incomplete.

Stage 8 adds the `SIMULATING_TRADES` worker stage between contract analysis and scoring.

- The worker persists BUY, SELL, and TRANSFER `SimulationRun` records.
- Until an isolated runner is configured, each run has outcome `UNSUPPORTED` and simulation tool `0.1.0-unsupported`.
- The stage is marked `SKIPPED` to make clear that no forked-chain transaction simulation was executed.
- Scoring still uses detector findings only; unsupported simulation records are not treated as passed checks.

Stage 9 adds the `DISCOVERING_MARKETS` worker stage between contract analysis and simulations.

- Until a DEX factory, subgraph, explorer, or curated market source is configured, the worker marks `DISCOVERING_MARKETS` as `SKIPPED`.
- Scan results include a liquidity summary.
- Empty liquidity results in Stage 9 mean discovery is unsupported, not that no liquidity exists.
- Persisted `LiquidityPool` rows are rendered when available, but LP ownership, reserves, locks, and depth are not verified yet.

Stage 10 adds the `ANALYZING_HOLDERS` worker stage between market discovery and simulations.

- Until a holder index, bounded Transfer-log scanner, or cached holder snapshot source is configured, the worker marks `ANALYZING_HOLDERS` as `SKIPPED`.
- Scan results include a holder summary.
- Empty holder results in Stage 10 mean analysis is unsupported, not that ownership is distributed.
- Persisted `HolderSnapshot` rows are rendered when available, but concentration, exchange attribution, burn addresses, and contract-controlled holder behavior are not verified yet.
