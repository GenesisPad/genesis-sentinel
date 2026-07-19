# ADR 0035: Hover Details, Contrast Fix, and Wallet-Cluster Graph Redesign

## Status

Accepted. Responds to a UI/UX batch covering the homepage result view and the token report page
(both render the same shared components, so every fix here applies to both): hover-to-expand
detail on the liquidity figure and risk-score bar, a text-contrast audit, removal of a
never-populated tooltip primitive's absence (it existed but was never wired up), a visual
redesign of the wallet-clustering bubble graph, and removal of a section that only ever echoed an
internal status string.

## Context

**A Radix tooltip component (`components/ui/tooltip.tsx`) existed but was never mounted or
used anywhere.** No `TooltipProvider` was in the component tree, so even importing `Tooltip`
would have rendered inert. This is why no hover affordance existed on the liquidity figure or the
risk-score bar despite the primitive being present in the codebase.

**`--color-faint: #6b736a` failed WCAG AA contrast.** Measured directly: 3.8:1 against
`--color-surface` and 4.1:1 against `--color-background`, both below the 4.5:1 AA threshold for
normal-size text. This token is used for the token-header's "Created X ago | N holders | Supply |
decimals" line (exactly what the user flagged as hard to read) and broadly across the app for
de-emphasized text.

**The "Plain-language assessment" section never contained plain language.**
`apps/web/src/lib/adapt.ts`'s `scoreExplanation()` returns `view.risk.message` directly — the
backend's internal status string, literally "Persisted risk assessment is available for this
scan." for any normal completed scan. The section's title promised something the content never
delivered.

**Quick Answers rendered a `Circle` icon in front of neutral facts** (market cap, 24h volume,
token age) — a bullet mark that communicated nothing a tone color didn't already.

**The wallet-cluster graph had no interactivity beyond a native `<title>` tooltip and no way to
reach an address's own history** — every other on-chain reference throughout the app is a plain
`shortAddress()` string with no link out.

## Decision

- Mounted `TooltipProvider` once in `apps/web/src/app/providers.tsx` (`delayDuration={150}`),
  making the existing `Tooltip`/`TooltipTrigger`/`TooltipContent` primitives usable app-wide.
- **Liquidity**: `LiquidityCard` and `QuickAnswers`' Liquidity answer both gained an info-icon
  hover revealing the paired-asset (ETH/quote) side's dollar value and an explicit note that
  `totalUsd` is the *combined* pool value while liquidity health is measured against the paired
  side alone — directly answering "what does this number actually mean."
- **Risk score bar**: `ScoreGauge`'s gradient bar is now a `Tooltip` trigger showing the exact
  score, its band label, and the full 5-band breakdown (Low 0-19 through Critical 80-100) with a
  hover-revealed position marker, replacing a bar that communicated only color at rest.
- **Contrast**: `--color-faint` raised from `#6b736a` to `#7a827a` (4.7-5.0:1 against the app's
  actual surface/background colors) — a single token-level fix that corrects every use of
  `text-faint` across the app at once, rather than patching individual components.
- **Circle icon removed**: `QuickAnswers`' `info` tone no longer renders an icon; neutral facts
  (market cap, 24h volume, token age) show as plain tone-colored text.
- **Badge divider**: `TokenHeader` renders a 1px vertical divider between the Verified/Unverified
  badge and the Dex Paid/Not Paid badge, only when both are actually known (never a divider
  floating next to a badge that isn't rendered).
- **"Plain-language assessment" section removed** entirely from `token-report-view.tsx` (both the
  section and its nav entry) — it never added information beyond the identical `risk.message`
  already implicit in the risk band shown one section above it.
- **Wallet-cluster graph redesigned**: radial gradients and an SVG `feGaussianBlur` glow filter on
  every node, a subtle non-bouncing pulse on the center token node
  (`@keyframes gs-pulse-ring`, opacity/stroke-width only, respects `prefers-reduced-motion`),
  hover/focus state that brightens the connected edge and enlarges the node, and a floating detail
  card replacing the terse native tooltip. Every address (including in the fallback list below the
  graph) is now an `<a>` linking to `${chain.explorerUrl}/address/{address}`, open in a new tab —
  the graph gained a required `chainId` prop to build these links correctly per chain.

## Consequences

- Full verification (`pnpm lint`, `typecheck`, `test`, `build`, `prisma:validate`) passed clean.
- Live-verified in a running dev server against fixture data (DOM/accessibility-tree inspection
  and computed-style checks, since screenshot capture was unavailable in this environment):
  confirmed the contrast fix renders as `rgb(122,130,122)` (`#7a827a`), confirmed the wallet-graph
  links resolve to correct Blockscout URLs, confirmed the assessment section and circle icon are
  gone, confirmed the badge divider's conditional logic.
- `WalletClusterGraph` is a breaking prop-signature change (`chainId` now required) — both call
  sites in `token-report-view.tsx` were updated in the same change.
- Because the homepage's `ResultSummary` and the token report page render the identical
  `ScoreGauge`/`QuickAnswers`/`LiquidityCard` components, none of these fixes needed separate
  homepage-specific changes.
- Deferred: hover detail was added to the two explicitly-requested surfaces (liquidity, risk bar)
  plus the wallet-cluster graph's redesign; other cards (holder concentration bars, trading
  simulation rows) were not given new hover affordances in this pass.
