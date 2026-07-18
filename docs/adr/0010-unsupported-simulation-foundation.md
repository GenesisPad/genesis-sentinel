# ADR 0010: Unsupported Simulation Foundation

## Status

Accepted.

## Context

Genesis Sentinel must eventually simulate buy, sell, and transfer behavior, but the current environment does not have a configured isolated simulation runner such as an Anvil fork. The product must not fake honeypot detection, tax estimates, buyability, sellability, or transfer success.

The schema already contains `SimulationRun`, so missing simulation coverage can be represented explicitly.

## Decision

Stage 8 records unsupported simulation intents for `BUY`, `SELL`, and `TRANSFER`.

The worker enters `SIMULATING_TRADES`, persists one `SimulationRun` per intent with outcome `UNSUPPORTED`, records simulation tool `0.1.0-unsupported`, marks the stage `SKIPPED`, and continues to detector-finding scoring.

Unsupported simulation runs do not affect Stage 7 scores.

## Consequences

- Public scan results can show simulation status without inventing outcomes.
- Users can distinguish missing simulation evidence from passed trade checks.
- Future Anvil-backed simulation can replace the unsupported runner behind the same persistence boundary.
- A future scoring version can include simulation findings without rewriting historical risk assessments.
