# Contract Code Existence

- Detector ID: `contract-code-existence`
- Version: `0.1.0`
- Finding code: `CONTRACT_CODE_ABSENT`
- Evidence: bytecode returned by the chain adapter at the scan block.

This detector reports a high-severity finding when the target address has empty bytecode (`0x`) at the scan block. It does not claim malicious behavior; it indicates the submitted address is not a deployed contract at that block.

Known limitations:

- A contract may self-destruct or be created after the scan block.
- Chain adapter/RPC inconsistency can affect bytecode reads.
