# Simulation Architecture

The worker records three simulation intents for each scan:

- `BUY`
- `SELL`
- `TRANSFER`

## Route-quote fallback (always available)

When no fork simulator is configured, or the discovered pool isn't a Uniswap V2 pool, or a
static `eth_call` for the buy/sell leg fails, results fall back to route-quote-only evidence
(constant-product math against live reserves plus a static router call) — real pool-math
evidence, but it cannot prove honeypot or exact tax, and `TRANSFER` reports `UNSUPPORTED`/
`DATA_UNAVAILABLE`. `apps/worker/src/scan-worker.ts`'s `createRobinhoodRouteTradeSimulations`
builds these.

## Real fork simulation (Milestone 5)

When `SIMULATION_FORK_ENABLED` is set and a Robinhood RPC URL is configured,
`apps/worker/src/fork-simulator.ts`'s `createGanacheForkTradeSimulator` runs genuine,
non-broadcast trades against a Ganache fork of the real chain, pinned to the scan block —
Ganache is used as the isolated local-fork system in place of Anvil, per the project's
"Anvil fork mode or an equivalent" allowance. Nothing here is ever broadcast to a live network;
the fork is an ephemeral local process torn down (`server.close()`) after the run, win or lose.

Within a single fork session, one sequence of real transactions is executed:

1. **Buy** — swaps a configured native amount (`SIMULATION_FORK_NATIVE_AMOUNT_WEI`) for the
   token via the real router, from a fork-only test wallet (private key hardcoded, funded only
   within the ephemeral fork, never used on a real chain). Captures `buyTaxBps` (expected vs.
   actual received) and `buyGasUsed`.
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

- Buy simulation is only wired for native/WETH-quoted Uniswap V2 pools; V3/V4 pools and
  non-native quote tokens fall back to route-quote-only evidence.
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
