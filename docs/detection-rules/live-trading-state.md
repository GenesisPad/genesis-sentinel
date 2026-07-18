# Live Trading State

- Detector ID: `live-trading-state`
- Version: `0.1.0`
- Finding codes: `TRADING_CURRENTLY_PAUSED` (`HIGH`), `TRADING_CURRENTLY_DISABLED` (`HIGH`)
- Evidence: live on-chain view-function call results at the scan block (`FUNCTION` evidence type).

The existing `pause-selector-patterns` and `trading-control-selector-patterns` detectors only
report that a pause/trading-toggle *capability* exists in bytecode — they cannot say whether it
is currently active. This detector calls candidate no-argument boolean view functions
(`paused()`, then `tradingOpen()`/`tradingEnabled()`/`tradingActive()` in order until one
succeeds) directly on-chain at the scan block via `apps/worker/src/scan-worker.ts`'s
`readBoolCandidate` helper, and reports the real current state:

- `paused() == true` → `TRADING_CURRENTLY_PAUSED`, `HIGH` severity.
- a trading-toggle function returns `false` → `TRADING_CURRENTLY_DISABLED`, `HIGH` severity.
- Both calls fail (function absent, reverts, or doesn't decode as `bool`) → `DATA_UNAVAILABLE`,
  never treated as "trading is open."
- Both calls succeed and show an open/unpaused state → `PASSED`.

Known limitations:

- Only tries the specific candidate function names above; a contract using a different name for
  its trading toggle will report `DATA_UNAVAILABLE`, not a false "open" state — this is the
  correct conservative behavior, but it does mean coverage is incomplete.
- A `true`/open result does not prove *everyone* can trade — a contract can selectively allow
  admin wallets to transact while blocking others; only buy/sell simulation from a non-privileged
  address can confirm that (see Milestone 5).
- Does not attempt to read numeric fee/limit values (buy/sell tax, max transaction/wallet
  amounts) — that is separate, deferred Milestone 2 work.
