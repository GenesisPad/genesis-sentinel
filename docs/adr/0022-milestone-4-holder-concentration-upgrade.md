# ADR 0022: Milestone 4 (Partial) — Raw/Adjusted Concentration, Top20, Locker Classification

## Status

Accepted. Milestone 4 is a large milestone (indexed-provider hierarchy, full non-user holder
taxonomy, fresh-wallet and related-wallet clustering); this ADR covers a first slice.

## Context

The existing Blockscout-backed `HolderProvider` computed only one "adjusted" concentration view
(excluding burn/pool/contract balances) and only top1/5/10. Milestone 4 explicitly requires
returning **both** raw and adjusted concentration, adding top20, and classifying more known
non-user holder categories — including "Lockers," which became possible to do for real once
ADR 0021 gave Sentinel a verified Genesis Locker contract address.

## Decision

Extended `HolderConcentration` (`packages/providers/src/types.ts`) with `top20Pct` and a new
`rawConcentration: { top1Pct, top5Pct, top10Pct, top20Pct }` field — the unadjusted top-N view,
computed over every returned holder row rather than the burn/pool/contract-excluded
`distributionRows` subset. The two views are kept as separate fields, never merged into one
number, matching the project's general pattern for evidence classes that come from different
sources or answer different questions (see ADR 0020's burned-vs-locked precedent).

Added a `LOCKER` label and `lockerPct` field. `createBlockscoutHolderProvider` gained an
optional `knownLockerAddresses` constructor option; `registry.ts` passes the real Genesis
Locker address for Robinhood Chain. A large balance held by a known locker contract is now
distinguishable from an unexplained large wallet, using real evidence (the same verified
address from ADR 0021), not a guess.

## Consequences

- `HolderConcentration` gained required fields (`top20Pct`, `lockerPct`, `rawConcentration`);
  any future direct consumer of this type must handle them. No existing consumer (web,
  Telegram, database) reads these new fields yet — they are additive and do not change any
  currently-displayed value.
- Milestone 4 remains partial: no vesting/bridge/exchange/treasury/router/staking
  classification (no verified address lists exist for any of these categories in this
  codebase); no fresh-wallet concentration; no related-wallet clustering with confidence/
  evidence (explicitly deferred to Milestone 6, deployer/wallet intelligence, where clustering
  logic belongs alongside deployer-history analysis).
- The data-source hierarchy is still single-tier (Blockscout explorer only) — no indexed
  provider, bounded transfer-log reconstruction, or cached snapshot fallback exists yet.
