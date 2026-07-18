# ADR 0018: Milestone 2 (Partial) — Real Storage- and Opcode-Level Detectors

## Status

Accepted. Milestone 2 is a large milestone (ownership/roles, supply, trading, fee, proxy, and
dangerous-external-control detector families); this ADR covers the first slice landed, not the
full milestone.

## Context

Milestone 2 requires detectors to combine "source, ABI, bytecode, storage, and live reads
together" and explicitly forbids treating function-selector presence alone as proof of
privileged, reachable behavior. The existing detector set (`selectorPatternDetectors`) is
entirely selector-presence-based: it substring-searches encoded 4-byte selectors inside raw
bytecode text and reports `MEDIUM`-confidence "surface detected" findings for ownership, proxy,
mint, pause, blacklist, max-transaction, trading-control, and fee-exclusion patterns. This is a
reasonable foundation but does not yet meet the "use storage and live reads" bar the milestone
sets, and a naive byte-presence check can misfire on data that merely resembles an opcode/selector.

## Decision

Added two new detectors to `packages/security-engine/src/index.ts`, both evidence classes the
selector-pattern detectors don't use:

1. **`eip1967-proxy-storage`** — reads the three standardized EIP-1967 storage slots
   (implementation/admin/beacon) directly on-chain via a new `ChainAdapter.getStorageAt` method
   (added to `packages/chain-adapters`). A non-zero implementation or beacon slot is direct proof
   of an active EIP-1967-style proxy, naming the real resolved implementation/admin address in
   the finding — not a guess from `implementation()`/`admin()` selector presence. An all-zero
   result is `PASSED` at `HIGH` confidence (confident about *this standard's* absence, not proxy
   behavior in general — the existing `proxy-selector-patterns` detector still runs alongside it
   for non-standard patterns).
2. **`dangerous-opcode-surface`** — walks the runtime bytecode as an actual instruction stream
   (tracking `PUSH1`-`PUSH32` immediate-data lengths so pushed constants are never misread as
   opcodes) to detect real `DELEGATECALL`/`SELFDESTRUCT` instructions, rather than substring- or
   selector-matching. `DELEGATECALL` is `MEDIUM` severity because it's required by virtually
   every proxy pattern and not inherently malicious; `SELFDESTRUCT` is `HIGH` since it's unusual
   in a standard token contract.

Both detectors were added to `runFoundationDetectors`, which now requires a
`StorageReaderDetectorInput` (`getStorageAt`) in addition to its existing bytecode/metadata/owner
inputs. `apps/worker/src/scan-worker.ts` wires this to `adapter.getStorageAt` — the only
orchestration change needed.

## Consequences

- `ChainAdapter` gained a new required method (`getStorageAt`), implemented in the viem adapter
  via `client.getStorageAt`. Any future non-viem adapter must implement it.
- `runFoundationDetectors`'s input type changed (added `StorageReaderDetectorInput`); all call
  sites (worker, security-engine's own tests) were updated.
- `apps/worker/src/scan-worker.test.ts`'s exact-match `toEqual` assertion of the full detector
  call sequence had to be updated to include the two new detector result records — a reminder
  that adding a foundation detector is not purely additive for that specific test style.
- Neither new detector consumes the Milestone-1 `ContractSourceProvider.getImplementation`
  (Blockscout-reported proxy metadata) as a cross-check; `eip1967-proxy-storage` is intentionally
  self-contained and provider-independent (on-chain storage is the more authoritative source
  anyway). Cross-referencing the two signals is deferred, not required for this slice.
- Remaining Milestone 2 detector families (ownership two-step/AccessControl/timelock/multisig,
  supply controls beyond mint, trading controls beyond selector patterns, fee-control value
  reads, remaining proxy standards, arbitrary-external-call/token-recovery/hardcoded-wallet
  detection) are not yet implemented — deferred to subsequent Milestone 2 work, tracked as an
  open task, not silently dropped.
