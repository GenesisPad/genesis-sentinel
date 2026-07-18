# Chain Adapters

Stage 3 introduces `packages/chain-adapters` as the boundary between Genesis Sentinel domain logic and EVM RPC clients.

## Robinhood Chain

Mainnet configuration:

- Chain ID: `4663`
- Native currency: `ETH`
- Public RPC: `https://rpc.mainnet.chain.robinhood.com`
- Block explorer: `https://robinhoodchain.blockscout.com`

This information is based on Robinhood's public chain documentation and ChainList. Robinhood's public RPC terms state that the public endpoint is rate-limited and is not intended for production-grade high-throughput or latency-sensitive applications.

Production deployments should configure:

- `ROBINHOOD_RPC_URL`
- `ROBINHOOD_FALLBACK_RPC_URLS`

The adapter does not accept arbitrary public-user RPC URLs.

## Interface Boundary

The `ChainAdapter` interface exposes normalized operations:

- block number and block lookup
- bytecode lookup
- contract reads
- logs
- transactions and receipts
- token metadata
- optional trace calls

The interface returns project-owned shapes rather than spreading viem types through the domain layer.

## Current Limitations

- No explorer API adapter is implemented yet.
- No trace adapter is implemented yet.
- No RPC circuit breaker is implemented yet.
- Token metadata reads are best-effort and return `null` for unavailable fields.
- No detector consumes the adapter until Stage 5.
