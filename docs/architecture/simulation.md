# Simulation Architecture

The worker records three simulation intents for each scan:

- `BUY`
- `SELL`
- `TRANSFER`

## Route-quote fallback (always available)

When no fork simulator is configured, or a static `eth_call` for the buy/sell leg fails, results
fall back to route-quote-only evidence — real pool-math evidence, but it cannot prove honeypot
or exact tax, and `TRANSFER` reports `UNSUPPORTED`/`DATA_UNAVAILABLE`.
`apps/worker/src/scan-worker.ts`'s `createRobinhoodRouteTradeSimulations` builds these, using:

- **Uniswap V2** — constant-product math against live reserves, plus a static router `eth_call`
  for the buy leg.
- **Uniswap V3** — a spot-price approximation from the pool's current `sqrtPriceX96` (ignoring
  price impact/concentrated-liquidity depth, since the probe amount is deliberately tiny). No
  static buy-leg `eth_call` exists for V3 yet — that check is `SKIPPED` with an honest reason,
  and V3 relies on the fork simulator (below) for a real pass/fail buy signal.

A Uniswap V4 pool, or a pool quoted in a token other than wrapped native, still falls back to
`UNSUPPORTED` — genuinely not supported yet.

## Real fork simulation (Milestone 5)

`SIMULATION_FORK_ENABLED` is set in production. When it's set and a Robinhood RPC URL is
configured, `apps/worker/src/fork-simulator.ts`'s `createGanacheForkTradeSimulator` runs
genuine, non-broadcast trades against a Ganache fork of the real chain, pinned to the scan
block — Ganache is used as the isolated local-fork system in place of Anvil, per the project's
"Anvil fork mode or an equivalent" allowance. Nothing here is ever broadcast to a live network;
the fork is an ephemeral local process torn down (`server.close()`) after the run, win or lose.

Both Uniswap V2 and V3 pools are supported. For V3, the fork wraps native currency into WETH
(`WETH.deposit()`) and swaps through the real, verified `SwapRouter02` contract
(`0xcaf681a66d020601342297493863e78c959e5cb2` — confirmed by reading
`GenesisProtocolConfig.swapRouter()` live on-chain and cross-checked against Blockscout, which
reports it as a verified contract named `SwapRouter02`) using `exactInputSingle`, at the pool's
own fee tier. V2 continues to swap through the V2 router directly. Both paths share the same
buy → transfer-test → partial-sell → full-sell sequence below.

Within a single fork session, one sequence of real transactions is executed:

1. **Buy** — swaps a configured native amount (`SIMULATION_FORK_NATIVE_AMOUNT_WEI`) for the
   token via the real router (V2 router, or V3 `SwapRouter02` for a V3 pool), from a fork-only
   test wallet (private key hardcoded, funded only within the ephemeral fork, never used on a
   real chain). Captures `buyTaxBps` (expected vs. actual received) and `buyGasUsed`.
2. **Wallet-to-wallet transfer** — sends ~10% of the bought tokens to a second, freshly
   generated fork-only account and measures received vs. sent, capturing `transferTaxBps` and
   whether the transfer succeeded at all (a blacklist/transfer-block would show up here).
3. **Partial sell** — sells another ~10% slice back through the router first, so a "small sell
   succeeds but a larger sell fails" pattern is distinguishable from a flat honeypot.
   Captures `partialSellTaxBps`/`partialSellSucceeded`.
4. **Full/remainder sell** — sells whatever remains, captures the primary `sellTaxBps`,
   `sellGasUsed`, and whether the token is a honeypot (`isHoneypot` — sell yields nothing).

Every step is independently wrapped so a failure in one (e.g. the transfer test reverts due to
a blacklist) does not abort the rest of the sequence — each result records its own
succeeded/failed status rather than one failure masking the others.

`apps/worker/src/scan-worker.ts` surfaces the full `ForkTradeSimulatorResult` object as
`forkSimulation` evidence on both the `BUY` and `SELL` `SimulationResult` records, and now
builds a *real* `TRANSFER` result (outcome `PASSED`/`FAILED`, real `transferTaxBps`) instead of
the permanent `DATA_UNAVAILABLE` placeholder whenever a fork simulator ran.

## Known limitations

- Fork buy/sell simulation is wired for native/WETH-quoted Uniswap V2 and V3 pools only; V4
  pools and non-native quote tokens fall back to route-quote-only (or fully `UNSUPPORTED` for
  V4) evidence.
- The V3 static buy-leg `eth_call` pre-check (the lightweight signal used when the fork
  simulator itself is unavailable) isn't implemented — only V2 has it. V3 tokens rely entirely
  on the fork simulator for a real buy/sell verdict.
- V3's expected-output baseline (used only for tax-percentage comparison, not for the actual
  swap) is a spot-price approximation from `sqrtPriceX96`, ignoring concentrated-liquidity depth
  and price impact — reasonable for the deliberately tiny probe amounts used, not a precise quote.
- Only one trade size is tested for buy (the configured native amount) and one size split for
  sell (10% partial + 90% remainder) — not the full "multiple trade sizes, multiple sender
  addresses, router-specific paths, repeat sell, delayed sell" matrix Milestone 5 describes.
  Those remain open, tracked work.
- No control-flow/state trace capture beyond balance deltas, gas used, and tx hashes.
- A successful simulation never proves safety — malicious contracts can behave differently
  based on `tx.origin`, sender, router, prior transactions, or real mempool conditions that a
  fork cannot fully reproduce.

## Deterministic fixtures/fork tests

No dedicated fork-integration test suite exists yet for `fork-simulator.ts` (it requires a live
RPC fork, which is unsuited to the existing fast unit-test suite). The deterministic fixtures
Milestone 5 calls for (fee-on-transfer, mutable-tax, blacklist, max-wallet, trading-disabled,
etc. tokens run against a real fork) remain open work.
