# ADR 0038: External-Call and Tax-Pattern Detector Precision

## Status

Accepted. Responds to two more false positives on a live `$GEN` scan the user flagged, in the same
false-FUD category as ADR 0034's `SOURCE_TAX_OR_LIMIT_CONTROL`/`MAX_TRANSACTION_CAPABILITY_SURFACE`
fixes: `SOURCE_ARBITRARY_EXTERNAL_CALL` firing on a benign, fixed-recipient ETH-send pattern, and
`SOURCE_TAX_OR_LIMIT_CONTROL`'s first pattern still bare-word-matching `buyTax`/`sellTax` as local
variable names rather than requiring an actual setter (the same underlying bug ADR 0034 fixed for
its *second* pattern, missed for the first).

## Context and root causes

**`SOURCE_ARBITRARY_EXTERNAL_CALL` matched any `.call(...)`, including the safe empty-calldata ETH-
send idiom.** The old pattern (`/\.\s*(?:delegatecall|call)\s*(?:\{[^}]*\})?\s*\(/`) fires on any
occurrence of `.call(` or `.delegatecall(` in source, with no distinction based on what's actually
being called. `$GEN`'s `GenesisToken.sol` pays its (fixed, constructor-only, no-setter)
`taxRecipients` array via `taxRecipients[i].call{value: share}("")` — empty calldata. A `.call`
with empty calldata can only ever trigger the target's `receive()`/`fallback()`; it cannot invoke
an arbitrary function, because there's no function selector or arguments to route to one. This is
in fact the pattern Solidity's own documentation recommends over `.transfer()`/`.send()` for
sending ETH (no fixed 2300-gas stipend that can break on smart-contract recipients) — the finding
was flagging *the recommended-safe idiom* with the same severity as a genuine arbitrary-calldata
call.

**`SOURCE_TAX_OR_LIMIT_CONTROL`'s first pattern still had the bare-noun flaw ADR 0034 fixed in its
second pattern.** `/\b(?:setTax|setTaxes|setFees|setBuyFee|setSellFee|buyTax|sellTax|taxFee|
marketingFee|liquidityFee)\b/i` included `buyTax`/`sellTax`/`taxFee`/`marketingFee`/`liquidityFee`
as *bare* alternatives — matching any occurrence of those words, not just a setter function.
`$GEN`'s `_update` computes `uint256 buyTax = (value * totalTax) / SWAP_DIVISOR;` — a per-transfer
*local variable* holding the tax amount owed on this specific transfer, derived from an immutable-
since-construction `totalTax` that's hard-capped at `MAX_TOTAL_TAX_BPS = 500` (5%) with no setter
anywhere in the contract. ADR 0034 already fixed this exact class of bug for the pattern's *second*
half (`maxWallet`/`maxTx`/`maxTransaction`) but missed that the *first* half had the identical
flaw.

## Decision

- `SOURCE_ARBITRARY_EXTERNAL_CALL` split into two patterns: `.delegatecall(...)` is always flagged
  (it executes the target's code inside the *caller's own* storage context regardless of
  arguments — genuinely dangerous no matter what); `.call(...)` is only flagged when its calldata
  is not the literal empty string `""`/`''` (a negative lookahead excludes the safe ETH-send
  shape). A `.call(realCalldataOrVariable)` — able to invoke any function on the target — is still
  flagged, as is `.call{value: x}(someBytes)`.
- `SOURCE_TAX_OR_LIMIT_CONTROL`'s first pattern narrowed to setter-shaped function declarations
  only: `/\bfunction\s+set(?:Tax|Taxes|Fees?|BuyFee|SellFee|BuyTax|SellTax|MarketingFee|
  LiquidityFee)\s*\(/i` — matching the same treatment ADR 0034 already gave the pattern's second
  half.

## Consequences

- Full verification (`pnpm lint`, `typecheck`, `test`, `build`, `prisma:validate`) passed clean.
  New regression tests in `packages/security-engine/src/index.test.ts` reproduce both real `$GEN`
  false positives (the fixed-recipient `.call{value}("")` distribution, and the local
  `buyTax`/`sellTax` variables) and separately confirm genuine risk is still caught: a `.call`
  carrying real calldata and a `.delegatecall` both still trigger `SOURCE_ARBITRARY_EXTERNAL_CALL`.
- This is the second time the exact same "bare keyword instead of setter-shape" bug class has
  needed fixing across two different patterns in the same rule set (ADR 0034's `maxWallet`/`maxTx`
  fix, and now `buyTax`/`sellTax`/`.call`). Any future `sourceRiskRules` pattern using a bare noun
  (not `function\s+setX\(` or an equivalent structural anchor) should be treated as suspect during
  review — it will false-positive on read-only getters, local variables, and struct/error field
  names sharing the same word.
