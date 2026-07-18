# Initial Threat Model

Genesis Sentinel is security infrastructure. The platform must assume adversarial tokens, adversarial token teams, noisy public users, and unreliable upstream infrastructure.

## Users

- Misinterpretation risk: users may treat "no critical risks detected" as a guarantee. UI and API copy must state that findings are risk indicators, not guarantees.
- Privacy risk: submitted wallet or token interests can reveal trading intent. Avoid unnecessary collection and retention.

## API

- Request flooding can exhaust workers, RPC quota, Redis, or PostgreSQL.
- Malformed addresses, large payloads, and unsupported chain IDs must be rejected before expensive work.
- Public clients must not supply arbitrary RPC URLs.
- Internal errors, stack traces, credentials, traces, and provider responses must be sanitized.

## Telegram Bot

- The bot can be spammed in groups or direct messages.
- Pasted addresses should be validated exactly like API requests.
- Bot responses must not expose internal errors or scanner secrets.

## Worker

- Malicious contracts may cause expensive calls, repeated reverts, or intentionally confusing traces.
- Each stage needs timeouts, bounded retries, concurrency limits, and dead-letter handling.
- Workers must preserve evidence and stage errors instead of collapsing all failures into generic scan failure.

## RPC Infrastructure

- Providers can return stale, incomplete, censored, or inconsistent data.
- RPC keys must be redacted from logs and never committed.
- Fallback providers should be tracked so evidence can be reproduced.

## Simulation Environment

- Simulations must never broadcast transactions or spend real funds.
- Anvil fork processes must be isolated from public input and bounded by time and resources.
- Some malicious contracts detect simulation, block conditions, router behavior, or privileged addresses; reports must document these limitations.

## Database

- Evidence must be durable and reproducible with chain ID, address, block number, scanner version, detector version, and timestamps.
- Mutable cached token state must be separated from immutable scan evidence.
- API keys must be hashed, never stored as plaintext.

## Risk Scoring Integrity

- Detector outputs must be deterministic and evidence-backed.
- Scoring changes must be versioned so historical scans remain interpretable.
- AI-generated conclusions must not be the source of truth for critical findings.

## False Positive Manipulation

- Token teams may dispute findings or engineer benign-looking surfaces that trigger noisy rules.
- Reports should include technical explanations, evidence, detector versions, and known limitations.

## False Negative Manipulation

- Contracts may hide behavior behind proxies, storage flags, router-specific branches, owner-only toggles, delayed activation, or anti-simulation checks.
- Inconclusive and unsupported checks must be visible instead of omitted.

## Malicious Token-Team Disputes

- The product should retain reproducible evidence and scanner versions for contested reports.
- Manual overrides, if added later, must be audited and never silently rewrite historical evidence.

## Resource Exhaustion

- Defenses include rate limits, request-size limits, idempotency, job deduplication, bounded worker concurrency, stage timeouts, retry caps, and provider circuit breakers.
