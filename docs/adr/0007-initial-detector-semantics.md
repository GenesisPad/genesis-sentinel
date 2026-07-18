# ADR 0007: Initial Detector Semantics

## Status

Accepted

## Context

The first detectors need to produce real, reproducible findings without overstating what bytecode inspection can prove.

## Decision

Stage 5 detectors may report:

- deployed bytecode presence or absence
- ERC-20 metadata read success or incompleteness
- common bytecode selector surfaces for ownership, proxy, mint, pause, and blacklist controls

Selector-based findings must be worded as capability surfaces. They must not claim exploitability, active privilege, or malicious intent without additional evidence such as storage reads, role checks, traces, or simulations.

## Consequences

- Findings are evidence-backed and reproducible at the scan block.
- False positives remain possible when selectors appear in dead code, libraries, or decoy paths.
- Stage 6+ can add storage, source, role, and simulation evidence to raise confidence where appropriate.
