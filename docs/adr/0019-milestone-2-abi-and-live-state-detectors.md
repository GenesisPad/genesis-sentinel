# ADR 0019: Milestone 2 (Continued) — ABI, Live-State, and Source-Pattern Detectors

## Status

Accepted. Continues ADR 0018; Milestone 2 is still not fully complete after this change (see
Known Limitations / Deferred below).

## Context

ADR 0018 added storage- and opcode-level evidence. This increment adds two more evidence
classes Milestone 2 calls for — verified ABI inspection and live on-chain state reads — plus two
additional source-text rules reusing the existing `sourceCodeRiskDetector` pattern-matching
infrastructure.

## Decision

Added to `packages/security-engine/src/index.ts`:

1. **`ownership-roles-abi`** — reads `ContractSourceDetectorInput.abi` (populated by the
   Milestone 1 source-provider chain) for `pendingOwner()`/`acceptOwnership()` (two-step
   ownership, `INFO`) and `hasRole()`/`grantRole()`/`DEFAULT_ADMIN_ROLE()` (AccessControl,
   `MEDIUM`). This is real ABI evidence — the compiler's own recorded function signatures —
   rather than a source-text regex guess.
2. **`live-trading-state`** — calls `paused()` and then `tradingOpen()`/`tradingEnabled()`/
   `tradingActive()` (first successful candidate wins) directly on-chain at the scan block via a
   new `readBoolCandidate` helper in `apps/worker/src/scan-worker.ts`, reporting the *current*
   pause/trading state rather than only the capability's existence.
3. Two new `sourceRiskRules` entries in the existing `sourceCodeRiskDetector`:
   `SOURCE_ROUTER_OR_PAIR_REPLACEMENT` (router/pair setter functions) and
   `SOURCE_ARBITRARY_EXTERNAL_CALL` (low-level `.call`/`.delegatecall` in source), covering more
   of the "dangerous external control" family.

Both new detectors are called directly in `apps/worker/src/scan-worker.ts`'s `ANALYZING_CONTRACT`
stage, alongside the existing `sourceCodeRiskDetector` call (not folded into
`runFoundationDetectors`, matching the existing precedent that `sourceCodeRiskDetector` itself
is called separately since it needs the source profile rather than bare bytecode).

## Consequences

- `apps/worker/src/scan-worker.test.ts`'s exact-match detector-call-sequence assertion was
  updated again (now includes `ownership-roles-abi` and `live-trading-state`).
- `readBoolCandidate` tries a fixed candidate name list; a contract using a differently-named
  trading toggle reports `DATA_UNAVAILABLE`, not a false-positive "open" claim — intentional,
  conservative behavior at the cost of coverage.
- Milestone 2 remains incomplete: deferred items include timelock/multisig controller
  identification, supply-control detail beyond mint-selector (max supply, burn capability,
  rebase/reflection), numeric fee/limit value reads, proxy standards beyond EIP-1967, and
  arbitrary token/ETH recovery, router/pair-replacement *live* verification (source-text only
  today), and hidden/hardcoded privileged-address detection.
