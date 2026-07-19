# ADR 0033: Milestone 8 — API Product Completion

## Status

Accepted. Closes out Milestone 8 (API product), following ADR 0031's first slice. Covers the
two remaining items from that ADR's deferred list that are honestly completable without new
infrastructure or a real account/ownership model: a self-lookup endpoint for API keys, and
exhaustive OpenAPI documentation for every `/v1/*` route.

## Context

ADR 0031 shipped the substantive API-key auth system, rate limiting, usage accounting, and the
missing token sub-resource/SSE endpoints, but left several items deferred:

- Exhaustive OpenAPI `schema` blocks — only `GET /v1/risk/:chainId/:address` got the full
  treatment, as a correct pattern to extend later.
- `GET /v1/api-keys/me` didn't exist — a caller could create a key (`POST`) and revoke it
  (`DELETE .../me`) but had no way to read back its own scopes, rate limit, or last-used
  timestamp without a database query it doesn't have access to.
- A real account/ownership model for API keys, `PROVIDER_HEAVY` usage-kind wiring, durable
  (Redis-backed) rate limiting, and billing were also deferred — these remain deferred here too;
  see Consequences for why.

## Decision

**`GET /v1/api-keys/me`.** Returns the presented key's own `ApiKeyView` record (name, prefix,
scopes, `rateLimitPerMinute`, `createdAt`, `lastUsedAt`, `revokedAt`) — never the hash or
plaintext. 401 when no key is presented, 503 when API-key management isn't configured on this
instance (matches the existing `POST`/`DELETE` behavior). This is still self-lookup only, the
same constraint `DELETE /v1/api-keys/me` already has: there is no account/ownership model, so a
key can only read its own record, never list or look up another.

**OpenAPI schemas for every remaining `/v1/*` route.** Added `description`, `tags`, and a
`response` block (with `additionalProperties: true`, per ADR 0031's discovered
fast-json-stringify truncation bug) to: `POST /v1/scans`, `GET /v1/scans/recent`,
`GET /v1/scans/:scanId`, `GET /v1/scans/:scanId/result`, `GET /v1/scans/:scanId/events`,
`GET /v1/tokens/:chainId/:address` and its four sub-resources (`/liquidity`, `/holders`,
`/deployer`, `/simulations`, `/findings`), `POST /v1/api-keys`, `GET /v1/api-keys/me`, and
`DELETE /v1/api-keys/me`. `POST /v1/scans` and `POST /v1/api-keys` also got a `body` JSON Schema
so the generated docs show the actual request shape, not just prose.

Declaring the schema's actual response status codes moved several `reply.code(503)` calls (the
"API-key management not configured" case) from implicitly-allowed to a TypeScript error — Fastify's
generic response typing only permits codes present in the schema. Fixed by adding `503` to those
three routes' response declarations rather than removing the check.

## Consequences

- Full verification (`pnpm lint`, `typecheck`, `test`, `build`, `prisma:validate`) passed clean
  across all 19 workspace packages. `apps/api` test suite grew from 22 to 23 tests (added
  coverage for `GET /v1/api-keys/me`, both the authenticated and 401 cases).
- Every response schema added here follows ADR 0031's `additionalProperties: true` rule; the
  full test suite re-passing after these changes confirms none of them silently truncated a real
  response the way an earlier, incomplete version of the risk-endpoint schema once did.
- Still deferred, and not attempted in this slice — these need either a real product decision or
  new infrastructure, not just more schema/endpoint code:
  - A real account/ownership model for API keys (list/revoke a key you don't currently hold).
    `GET /v1/api-keys/me` completes the self-service surface within the current no-accounts
    design; it doesn't add accounts.
  - `PROVIDER_HEAVY` usage-kind wiring — still no endpoint does a live, heavy provider call
    (every route here reads persisted scan data); wiring it to something now would be a fabricated
    classification, not a real one.
  - Durable/distributed rate limiting (still in-memory, resets on restart) and billing (explicitly
    out of scope per the milestone's own spec — only `APIUsage.units` exists as groundwork).
- Milestone 8 is now considered complete for this spec's scope. Per the standing roadmap, next up
  is Milestone 9 (Telegram scanner completion), pending user direction.
