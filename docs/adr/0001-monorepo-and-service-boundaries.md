# ADR 0001: Monorepo and Service Boundaries

## Status

Accepted

## Context

Genesis Sentinel needs a public web scanner, API, Telegram bot, worker, shared evidence model, and shared security engine. All surfaces must use the same scan results and risk contracts.

## Decision

Use a private pnpm/Turborepo monorepo with deployable applications in `apps/` and focused packages in `packages/`.

Initial deployable applications:

- `apps/web`
- `apps/api`
- `apps/worker`

Initial packages are limited to real Stage 1 implementation needs: config, observability, shared contracts, database readiness, and queue readiness.

## Consequences

- Shared contracts can be versioned and tested in one repository.
- API and worker can evolve independently while using the same domain package.
- Empty future packages are deferred until their contracts are real.
