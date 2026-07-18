# ADR 0026: Milestone 7 — Scoring Engine Completion

## Status

Accepted.

## Context

The prior scoring model (`scoringVersion` `0.1.0-finding-weighted`) already weighted findings by
severity and confidence, capped each category at 100, and took the maximum category score as the
overall score — a sound foundation that already avoided unbounded addition. What it did not do:
persist per-finding contributions (so a score could not be reconstructed after the fact), persist
any record at all when a scan produced zero findings (silently indistinguishable from "no risk
found" unless the caller separately checked for a missing row), or surface *why* evidence was
missing when it was. The spec requires all of these to be persisted and requires a documented
model with worked examples showing that one category's good news does not erase another
category's finding.

## Decision

Extended `RiskAssessment`/`RiskSnapshot` (`packages/shared/src/index.ts`) with
`findingContributions: FindingContribution[]` (one entry per finding: code, category, severity,
confidence, weight) and `unableToAssessReasons: string[]`; widened `score` to `number | null`;
added optional `explanation` to `CategoryScore`.

Rewrote `scoreFindings` (`packages/security-engine/src/index.ts`) to take the full
`DetectorResult[]` (not just the flattened findings) so it can inspect every detector's `checks`,
not only its findings. It now **always** returns an assessment:

- Zero findings → `level: "UNABLE_TO_ASSESS"`, `score: null`, `unableToAssessReasons` built from
  every check across all detector results with outcome `UNSUPPORTED`, `DATA_UNAVAILABLE`,
  `INCONCLUSIVE`, or `FAILED` (falling back to a generic reason if no such checks exist either).
- One or more findings → same severity/confidence weighting and max-of-category aggregation as
  before, plus `findingContributions` for every finding and `unableToAssessReasons` collected the
  same way — evidence gaps are surfaced even when a numeric score was also produced, since one
  category can have real findings while a different category's evidence is simply missing.

Bumped `scoringVersion` to `0.2.0-category-weighted-with-gap-reasons` per the project's own rule
that scoring changes require a new version and never rewrite historical results.

Updated `apps/worker/src/scan-worker.ts`'s `SCORING` stage to always call
`recordRiskAssessment` (previously skipped entirely when `scoreFindings` returned `null`) and
mark the stage `SUCCEEDED`/`SKIPPED` based on whether a numeric score resulted.

Extended the `RiskAssessment` Prisma model (migration `20260718210000_risk_assessment_gap_reasons`):
`score` is now nullable, plus new `contributions Json @default("[]")` and
`unableToAssessReasons String[] @default([])` columns (both default to empty so the migration is
safe against the already-deployed Contabo database). `recordRiskAssessment` and `toRiskSnapshot`
(`packages/database/src/index.ts`) were updated to write/read both new fields; `toRiskSnapshot`
now derives its `status` (`AVAILABLE` vs `UNABLE_TO_ASSESS`) from whether `score` is null rather
than from whether a `RiskAssessment` row exists at all, since a row is now always present.

Documented the completed model, including the version history and the five required worked
examples (owner-controlled mint ≠ honeypot; renounced ownership doesn't erase proxy-admin risk;
locked liquidity doesn't remove tax risk; sellability doesn't remove blacklist risk; missing
simulation doesn't imply safety) in `docs/architecture/risk-model.md`. Added six golden tests in
`packages/security-engine/src/index.test.ts` (`describe("risk scoring")`) asserting the actual
`scoreFindings` behavior for each scenario plus the null/empty and evidence-gap cases.

## Consequences

- `scoreFindings`'s signature changed from `(SecurityFinding[], scannerVersion)` to
  `(DetectorResult[], scannerVersion)` and no longer returns `null`. The one call site
  (`apps/worker/src/scan-worker.ts`) and all test call sites were updated.
- Every hand-built `RiskSnapshot`/`RiskAssessment`-shaped test fixture across
  `apps/api/src/app.test.ts`, `apps/api/src/telegram.test.ts`, `apps/web/src/lib/adapt.test.ts`,
  and `packages/database/src/index.test.ts` needed the two new required fields added.
- The exact-match detector-call-sequence assertion in `apps/worker/src/scan-worker.test.ts`
  needed a `risk:UNABLE_TO_ASSESS:null` entry inserted, since `recordRiskAssessment` is now
  called unconditionally.
- Full verification (`pnpm lint`, `typecheck`, `test`, `build`, `prisma:validate`) passed clean
  across all 19 workspace packages after this change.
- Deferred, not attempted: any weighting change beyond persisting/surfacing what the model
  already computed — i.e., no new detector-level "exploitability" or "controller status" logic
  was added here, because that reasoning already lives correctly at the detector layer (see the
  "What the score does and does not account for" section of `docs/architecture/risk-model.md`);
  Milestone 8's API surface for exposing `findingContributions`/`unableToAssessReasons` on
  dedicated endpoints (e.g. `GET /v1/risk/:chainId/:address`) is not yet built — only the
  underlying `RiskSnapshot` shape is ready for it.
