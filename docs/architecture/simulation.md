# Simulation Architecture

Stage 8 introduces the simulation persistence boundary without executing live simulations.

The worker records three simulation intents for each scan:

- `BUY`
- `SELL`
- `TRANSFER`

When no isolated simulation runner is configured, each persisted `SimulationRun` has:

- `outcome`: `UNSUPPORTED`
- `simulationTool`: `0.1.0-unsupported`
- A result reason explaining that no buy, sell, or transfer simulation was executed

Unsupported simulation records are evidence of missing simulation coverage. They are not passed checks and must not be interpreted as trade safety, buyability, sellability, tax rate, or transfer success.

Future live simulation work should:

- Run only against isolated forked state.
- Never broadcast transactions.
- Pin simulations to the scan block.
- Capture revert reason, gas used, token balance deltas, native balance deltas, and effective tax where derivable.
- Persist one `SimulationRun` per attempted scenario.
- Feed simulation findings into a new scoring version rather than changing historical score semantics.
