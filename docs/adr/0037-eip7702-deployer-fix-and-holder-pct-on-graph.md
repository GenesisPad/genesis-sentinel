# ADR 0037: EIP-7702 Deployer Correction and Holder % on the Wallet Graph

## Status

Accepted. Responds to a live `$GEN` scan the user flagged: the deployer was still wrong after
ADR 0034/0036's fixes, and ownership couldn't be determined. Also implements the user's explicit
ask to show each connected wallet's % holding on the wallet-cluster graph.

## Context and root causes

**EIP-7702 broke the "is_contract === false means a real signer" assumption.** `$GEN`'s creation
transaction sender is `0x8CFa8492...` — the exact same real person's wallet seen signing the Noxa
Launchpad transaction analyzed in ADR 0034/0036 (there, `is_contract: false`). Here, Blockscout
reports `is_contract: true` for that *same* address, but tagged `proxy_type: "eip7702"` — the
account has delegated itself a smart-account implementation (`SemiModularAccount7702`), a
legitimate EIP-7702 feature (account abstraction, session keys, batched txs), not evidence it's
some other factory or contract. ADR 0034's `deployerIsLaunchFactory` heuristic required
`!txSenderIsContract`, so it correctly excluded genuine contracts but also wrongly excluded this
EIP-7702-delegated EOA — leaving `$GEN`'s `deployerAddress` pointed at the launch contract
(`0x17da64...`, Blockscout-tagged `Create2Factory`) instead of the real creator.

**Confirmed (per user correction) that `$GEN` used a different, legacy launcher than the Noxa
case.** `$GEN`'s creation tx `to` is `0x513a8718...`, name-tagged "GenesisPad" directly on
Blockscout, method `createToken` — a legacy bonding-curve launcher, distinct from Noxa's
`launchToken`/"Launch Factory" contract analyzed in ADR 0034. Both hit the identical underlying
bug (factory misattributed as deployer), confirming the fix needs to be launcher-agnostic, which
it already was — it just needed the EIP-7702 carve-out to actually fire for this specific launch.

**Ownership genuinely cannot be read via `owner()` — verified from `$GEN`'s real, verified
source.** Pulled `GenesisToken.sol` directly from Blockscout: it does not inherit `Ownable` and
has no `owner()`/`getOwner()`/`_owner()` function of any kind (confirmed by calling all three
directly against the live contract — all revert). Instead, three functions
(`setUniswapPair` — one-time only, `withdrawStuckETH`, `recoverEC20`) are gated on a *private*
`_recipient` address set once in the constructor, with no setter, transfer, or renounce mechanism
for it anywhere in the contract — the privileged role is permanent, not merely "not yet
renounced." Sentinel's `ownershipStatusDetector` correctly reports `UNKNOWN`
(`OWNER_READ_UNAVAILABLE`) here because there genuinely is no `owner()` to read — this is honest,
not a bug. (Considered broadening `SOURCE_ADMIN_TRANSFER_SURFACE`'s regex to catch
`recoverEC20(address _token)` — declined: that function explicitly excludes rescuing `$GEN`
itself and only sweeps foreign tokens accidentally sent to the contract, a common benign utility
pattern; broadening the match would introduce new false positives on the exact kind of pattern
this session has been removing.)

## Decision

- `packages/providers/src/blockscout.ts`: `txSenderIsContract` now also checks
  `txFrom.proxy_type !== "eip7702"` — an EIP-7702-delegated account still counts as the real
  signer for the launch-factory correction, even though `is_contract` reports `true`.
- Wallet-cluster graph now shows holding percentage. `WalletClusterEdge` gained
  `holdingPct?: number | null`; `apps/web/src/lib/adapt.ts`'s `extractWalletCluster` cross-
  references each edge's address against the persisted top-holders snapshot
  (`buildHolderPctLookup`) and attaches the matching `totalSupplyPct` when present — `null`
  (never a guess) when the address falls outside whatever the snapshot tracked.
  `wallet-cluster-graph.tsx` renders the percentage under each node's address label, in the
  floating hover detail card, and next to each entry in the fallback list.

## Consequences

- Full verification (`pnpm lint`, `typecheck`, `test`, `build`, `prisma:validate`) passed clean.
  New regression tests: `blockscout.test.ts` reproduces `$GEN`'s exact EIP-7702 shape (asserting
  the correction still fires) and a companion test confirming a *genuine* contract sender (no
  `eip7702` tag) is still correctly excluded, so the relaxation doesn't over-broaden. `adapt.test.ts`
  covers `holdingPct` attachment from a top-holders snapshot match.
- `WalletClusterEdge`'s exact-match test in `adapt.test.ts` needed updating to include the new
  `holdingPct: null` field — `toEqual` doesn't ignore an explicit `null`, only `undefined`.
- Existing scans keep whatever deployer address they were persisted with; a rescan is needed to
  pick up the EIP-7702-aware correction for `$GEN` and any other token launched by a signer whose
  wallet has a 7702 delegation attached.
- Deferred: did not build a new detector for `$GEN`'s "permanent privileged recipient, no
  renounce mechanism" pattern — the honest `UNKNOWN` ownership status, combined with the now-
  corrected deployer address (which is the same address as `_recipient`, since the deployer
  receives the initial mint), already surfaces the relevant fact without a new, narrowly-scoped
  detector that could misfire on differently-shaped contracts.
