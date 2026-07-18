# ERC-20 Metadata

- Detector ID: `erc20-metadata`
- Version: `0.1.0`
- Finding code: `ERC20_METADATA_INCOMPLETE`
- Evidence: `name`, `symbol`, and `decimals` read attempts.

This detector reads common ERC-20 metadata fields. Missing metadata is reported as a low-severity review signal, not proof of malicious behavior.

Known limitations:

- Some valid tokens omit or customize metadata functions.
- Metadata can be proxied or dynamic.
