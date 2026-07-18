# ADR 0013: Production Deployment Hardening

## Status

Accepted

## Context

Genesis Sentinel has enough persisted scanning flow to run as a private alpha, but it needs repeatable deployment, runtime limits, and smoke checks before being treated as production-like.

## Decision

Stage 11 adds Dockerfiles for the API, worker, and web applications, a production compose template, configurable API rate limits, configurable worker concurrency, and a smoke-test script for deployed environments.

The project remains scanner-honest: deployment hardening does not turn unsupported liquidity, holder, simulation, or source-verification checks into production evidence.

## Consequences

- The system can be deployed consistently across environments.
- Operators can tune API and worker pressure without code changes.
- Basic production smoke tests are available.
- Public production still depends on monitoring, migrations, hosted dependencies, and at least one live data upgrade.
