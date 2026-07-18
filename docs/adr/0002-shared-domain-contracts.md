# ADR 0002: Shared Domain Contracts

## Status

Accepted

## Context

The web app, API, Telegram bot, worker, and future detectors must agree on scan states, findings, evidence, risk categories, confidence, and detector versioning.

## Decision

Define shared domain contracts in `packages/shared` and detector execution contracts in `packages/security-engine`.

`packages/shared` owns cross-surface data shapes such as scan progress, finding evidence, security findings, category scores, and risk assessments. `packages/security-engine` owns detector metadata, detector inputs, detector check outcomes, and detector result contracts.

## Consequences

- Interfaces can share persisted scan results without duplicating risk logic.
- Detector implementations can be independently testable and versioned.
- API and UI code can compile against contracts before real detectors exist.
- The contracts must remain conservative: an empty result does not mean a check passed.
