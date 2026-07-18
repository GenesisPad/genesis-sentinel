# Selector Pattern Detectors

Version: `0.1.0`

These detectors search target bytecode for common function selectors:

- `ownership-selector-patterns`
- `proxy-selector-patterns`
- `mint-selector-patterns`
- `pause-selector-patterns`
- `blacklist-selector-patterns`

Selector presence is deterministic bytecode evidence that a capability surface may exist. It does not prove the function is reachable, active, privileged, or exploitable.

Known limitations:

- Selectors can appear in bytecode for unused, dead, library, or decoy code paths.
- Selectors can be omitted when contracts use fallback dispatch, obfuscation, or nonstandard interfaces.
- Storage, role, owner, and simulation checks are required before stronger conclusions.
