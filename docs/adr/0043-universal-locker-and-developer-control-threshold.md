# ADR 0043: Universal locker evidence and developer-control threshold

## Status

Accepted.

## Context

Genesis Sentinel recognized the earlier Genesis Locker contracts but not the production Genesis
Universal Locker at `0xF88535677f27334Ee5F977dD055C790524160789`. This caused token transfers
into verified lock custody to remain eligible for developer-cluster attribution, and V3 position
locks in the universal locker were not identified. Deployer history also emitted a scored INFO
finding merely because another token from the same deployer had been scanned.

The product policy is custody-based: assets in an active locker record are not currently controlled
by the developer. Developer-linked token holdings are material only when their verified current
aggregate is strictly greater than 5% of total supply. Prior deployments are context, not adverse
history, unless a prior scan actually recorded HIGH or CRITICAL findings.

## Decision

- Add Genesis Universal Locker to Robinhood Chain's composite locker and holder registries.
- Verify ERC20 and V2 LP locks from `getTokenLocks`/`getLock`; exclude only the amount that remains
  unwithdrawn and not currently claimable.
- Verify a universal-locker V3 position using both `ownerOf()` custody and the locker's own
  `getLock(positionManager, tokenId)` record. Pending, withdrawn, or expired position custody is
  not described as locked.
- Exclude a locker recipient from developer clustering only when an active token lock record was
  verified. A direct transfer to a known locker address is insufficient.
- Persist verified token-lock details in holder concentration evidence and expose them through the
  shared API summary, Telegram report, and web holder report.
- Treat developer/deployer/owner concentration as a risk only when it is strictly above 5%.
- Keep benign prior deployment history as a PASSED context check with no finding.
- Keep positive locker/GenesisPad provenance findings visible as evidence but exclude them from
  risk-score contributions.

## Consequences

New scans correctly separate custody from control. Existing persisted scans retain their old
evidence and score until rescanned. The bot, web app, and partner API share the same persisted scan
and scoring result, so no surface-specific risk threshold is introduced.
