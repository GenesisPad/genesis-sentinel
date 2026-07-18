# EIP-1967 Proxy Storage

- Detector ID: `eip1967-proxy-storage`
- Version: `0.1.0`
- Finding codes: `EIP1967_PROXY_DETECTED`, `EIP1967_BEACON_PROXY_DETECTED`
- Evidence: implementation/admin/beacon storage slot values, read directly on-chain at the scan block (`STORAGE` evidence type).

This detector reads the three standardized EIP-1967 storage slots directly on-chain:

- Implementation slot: `0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bb`
- Admin slot: `0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103`
- Beacon slot: `0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50`

A non-zero implementation or beacon slot is direct, real evidence of an EIP-1967-style proxy — not a guess from function-selector presence. A `HIGH` severity `CONTRACT_CONTROL` finding is raised naming the resolved implementation (and admin, if set) address, since contract logic behind this token can be changed by whoever controls the upgrade authority.

An all-zero result is reported as `PASSED`/`EIP1967_PROXY_ABSENT` with `HIGH` confidence — that confidence reflects certainty about the *absence of this specific standard*, not certainty that the contract has no proxy behavior at all. It intentionally does not attempt to detect non-standard patterns (transparent-without-EIP1967-slots, UUPS variants that skip the slot, minimal/diamond proxies); the existing `proxy-selector-patterns` bytecode-selector detector may still flag those separately, at lower (`MEDIUM`) confidence, since it only observes function-selector presence rather than storage.

Known limitations:

- Does not identify which specific proxy standard (transparent/UUPS/beacon-with-custom-slots) produced a non-EIP-1967 result — `proxyPattern` in the underlying evidence type is always `"UNKNOWN"` unless a future detector adds pattern-specific storage checks.
- Does not verify the implementation address itself is a real, non-empty contract.
- Does not cross-check against an explorer-reported implementation address (e.g. Blockscout's `/smart-contracts` proxy metadata from `@genesis-sentinel/providers`); this detector is independent of and does not currently consume that signal.
