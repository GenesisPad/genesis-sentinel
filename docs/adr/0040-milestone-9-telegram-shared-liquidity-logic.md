# ADR 0040: Milestone 9 — Telegram/Web Shared Liquidity Logic and Full Report Link

## Status

Accepted. Milestone 9 (Telegram scanner completion), picked up per the standing roadmap after
Milestone 8. Telegram already had a mature command surface (`/start`, `/help`, `/scan`,
`/status`, `/result`, `/track`, `/tracked`, `/untrack`, auto-tracking, rate limiting, section
buttons) built across earlier sessions — auditing it against this session's web-side fixes found
it had never inherited any of them, since Telegram formats its own report text from
`ScanResultView` independently of the web app's `adapt.ts` mapping layer.

## Context

Two of this session's real bugs (found on live `$CASHCAT` and `$UHOOD` scans, fixed for the web
app in earlier ADRs) turned out to exist identically in Telegram's parallel formatting code,
because nothing shared the underlying logic between the two surfaces:

- **Pool selection**: `readLiquidityData` picked `result.liquidity.pools[0]` — the first pool in
  persisted (discovery) order, not the one with real liquidity. The exact `$CASHCAT` failure mode
  (a near-zero pool discovered first, the real $2.7M pool discovered later) would have shown
  identically broken numbers in Telegram.
- **Negligible liquidity reading as neutral**: `liquidityLine` showed a raw dollar figure with no
  health signal at all — no equivalent of the web's health-tier coloring existed in Telegram to
  begin with, so a `$UHOOD`-style drained pool would show its true (tiny) dollar figure but with
  no accompanying danger cue, same root problem as the web bug before ADR 0036.

Also missing entirely: Dex-paid status (the field exists on `TokenProfileView` and is already
shown on the web app) and any link back to the web app's much richer report — the wallet-cluster
graph, full findings list, and detailed evidence Telegram's compact format can't reproduce.

## Decision

- Moved `selectPrimaryLiquidityPool` and `liquidityHealthTier`/`NEGLIGIBLE_LIQUIDITY_USD` from
  `apps/web/src/lib/adapt.ts` into `@genesis-sentinel/shared`, with the web app now importing
  them rather than keeping its own copy. Both are pure functions over already-shared types
  (`LiquidityPoolView`), so the move required no new dependencies.
- `apps/api/src/telegram.ts`'s `readLiquidityData` now uses the shared pool-selector and computes
  a health-tier label the same way the web app does; `liquidityLine` displays it.
  Added `dexPaidLine` reading the existing `token.dexPaid` field.
- Added `WEB_PUBLIC_APP_URL` to `packages/config`'s env schema (defaults to
  `https://sentinel.genesispad.app`). `createTelegramBot` takes an optional `webAppUrl`; when
  set, `createTelegramResultKeyboard` adds a "Full Report" URL button linking to
  `{webAppUrl}/token/robinhood/{address}` (Robinhood Chain is the only chain implemented
  end-to-end today, matching every other Robinhood-only assumption already in this file, so the
  URL segment is hardcoded rather than needing a numeric-to-slug chain registry for one link).

## Consequences

- Full verification (`pnpm lint`, `typecheck`, `test`, `build`, `prisma:validate`) passed clean.
  New tests: `packages/shared/src/index.test.ts` covers `liquidityHealthTier` and
  `selectPrimaryLiquidityPool` directly; `apps/api/src/telegram.test.ts` reproduces the exact
  `$CASHCAT`/`$UHOOD` shapes end-to-end through `formatTelegramResultReply` and confirms the
  Full Report button/URL.
- This is a template for any future correctness fix found in one surface: check whether the other
  surface (web or Telegram) has the same independent implementation before considering the fix
  complete, and prefer moving genuinely shared logic into `@genesis-sentinel/shared` over
  duplicating it.
- Deferred, not attempted this slice: BotFather command-description registration, Redis-backed
  multi-instance rate limiting, scheduled re-scan/alerts for tracked addresses — all still listed
  in `docs/architecture/telegram-bot.md`'s "Remaining Work" section from earlier sessions and
  unrelated to the correctness gap this ADR closes.
