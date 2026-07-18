# Ownership and Role ABI Inspection

- Detector ID: `ownership-roles-abi`
- Version: `0.1.0`
- Finding codes: `TWO_STEP_OWNERSHIP_PATTERN` (`INFO`), `ACCESS_CONTROL_ROLE_SURFACE` (`MEDIUM`)
- Evidence: verified contract ABI function names (`EXTERNAL_SOURCE` evidence type).

This detector reads the verified contract ABI (from `ContractSourceDetectorInput.abi`, populated
by the Milestone 1 source-provider chain when a provider returns `VERIFIED` status) and checks
for specific function names rather than matching source text or bytecode selectors:

- **Two-step ownership**: both `pendingOwner()` and `acceptOwnership()` present in the ABI.
  Reported at `INFO` severity — this is not itself a risk signal, but it changes how a plain
  `owner()`-equals-burn-address check should be interpreted, since a transfer may be pending.
- **AccessControl roles**: `hasRole()` + `grantRole()`, or `DEFAULT_ADMIN_ROLE()`, present in the
  ABI. Reported at `MEDIUM` severity/`HIGH` confidence — stronger evidence than the existing
  `SOURCE_PRIVILEGED_ROLE_CONTROL` source-text-regex finding, since ABI reflects the compiler's
  own recorded function signatures rather than a keyword match.

When source verification is unavailable or returned no ABI, this reports `ABI_UNAVAILABLE`/
`DATA_UNAVAILABLE`, never a passing or failing security claim.

Known limitations:

- ABI presence does not prove any address currently holds a role, nor that `acceptOwnership()`
  is reachable by anyone other than the current `pendingOwner`.
- Does not attempt to read actual role holders on-chain (that would require knowing the specific
  role hash constants and calling `hasRole(role, address)` for candidate addresses — deferred).
- Does not detect timelock or multisig controllers; that remains open Milestone 2 work.
