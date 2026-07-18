# ADR 0015: AI-Assisted Contract Review (Proposal)

## Status

Proposed. Written up for evaluation by whoever owns `packages/security-engine` / `apps/worker` — not implemented, not accepted. Nothing in this ADR should be built without a separate decision to proceed.

## Context

The current detector suite (`packages/security-engine`) failed to flag a contract that turned out to be malicious. Before reaching for AI as the fix, it's worth being precise about *why* the miss happened, because "the auditor couldn't tell the code was malicious" describes at least two structurally different gaps that need different fixes.

### What the current detectors actually check

Every contract-control detector today (`ownership-selector-patterns`, `proxy-selector-patterns`, `mint-selector-patterns`, `pause-selector-patterns`, `blacklist-selector-patterns`, `max-transaction-selector-patterns`, `trading-control-selector-patterns`, `fee-exclusion-selector-patterns`) works the same way: hash a known function signature, then check whether that 4-byte selector's hex substring appears anywhere in the deployed bytecode (`packages/security-engine/src/index.ts`, `createSelectorDetector`).

This proves a function *with that signature exists*. It proves nothing about:

- what the function's logic actually does (a `mint(address,uint256)` selector could be present on a function that reverts unconditionally, or absent because the mint logic was inlined/renamed/reached through a proxy)
- whether the privileged path is reachable by anyone other than a burned owner
- runtime behavior — the honeypot/tax pattern (buy succeeds, sell reverts or is taxed near 100%) is invisible to any static bytecode check, selector-based or not

The one detector that reads real state instead of pattern-matching is `ownership-status`, which calls `owner()` on-chain and classifies renounced vs. active. That's the model worth extending, not the selector-matching model.

### The two distinct failure modes

1. **Missed malicious *logic*** — a verified-source contract does something harmful in a way that doesn't correspond to any of the ~8 known selector signatures we check for (custom-named functions, logic split across multiple functions, conditional/delayed malicious behavior, obfuscated intent). Static substring matching structurally cannot catch this class; it only recognizes patterns it was told to look for in advance.
2. **Missed honeypot/runtime behavior** — the contract's *code* may look unremarkable, but a real buy-then-sell sequence fails or gets taxed away. No amount of *reading* code (by a human, a static analyzer, or an LLM) is as reliable here as *executing* a trade against it and observing the result. This is exactly the `SIMULATING_TRADES` gap already called out as deferred in this session's Phase 1 work — it needs a stateful fork simulator (Anvil/Foundry: impersonate an account, real buy tx, mine it, real sell tx, observe revert/amount), which isn't available in the current environment.

Which of these two happened in the incident that prompted this ADR determines which fix has leverage. If it's (2), an LLM adds cost and false confidence without addressing the actual gap.

## Options considered

### A. LLM reads verified Solidity source and produces a plain-language risk narrative

Feed source (only when `sourceVerified: true` — no reasoning over raw bytecode, LLMs are weak at that) to a model with a scoped prompt: summarize privileged functions, flag logic that contradicts the token's apparent behavior, cite the specific lines it's concerned about.

**Addresses:** failure mode 1 (novel/obfuscated malicious logic in verified contracts).
**Does not address:** failure mode 2, or any unverified contract (most rugs).

**New risks this introduces**, which the codebase doesn't have to think about today:

- **Non-determinism.** Same contract, same block, different score on rescan — directly at odds with this project's evidence-backed, reproducible-finding design (every existing finding traces to a specific selector match or on-chain read).
- **Hallucination.** A model can assert a function does something it doesn't. Given the project's explicit "no fabricated values" stance, an ungrounded LLM claim is arguably worse than `DATA_UNAVAILABLE` — it's confident-sounding fabrication, which is precisely what the existing detectors are designed never to produce.
- **Prompt injection.** Token name, symbol, NatSpec comments, and source code are all attacker-controlled input. If any of that text is concatenated into a prompt, a deployer can plant instructions targeting the reviewer model. This needs explicit treatment (strict system/user separation, output schema validation, treat all contract-derived text as untrusted data) before this ships, not after.
- **Cost/latency per scan.** Unlike the current detectors (near-free, deterministic, run inline in `ANALYZING_CONTRACT`), an LLM call adds real per-scan cost and multi-second latency, which matters for a scanner that's meant to answer "can I buy/sell" quickly.

### B. Real trade simulation via a stateful fork (Anvil/Foundry)

Deterministic, directly observes the failure mode people mean when they say "honeypot," and matches the project's existing evidence model exactly: a finding backed by an actual transaction result, not an inference.

**Addresses:** failure mode 2 entirely, plus a wide class of "logic problems" that manifest as runtime behavior regardless of why the code was written that way (tax logic, blacklist logic, pausable logic — all of these are equally well caught by *executing* a transfer as by reading the function that implements it).
**Does not address:** failure mode 1 in verified contracts where the malicious path isn't exercised by a simple buy/sell/transfer (e.g., a time-locked or admin-gated drain function that a 3-tx simulation wouldn't trigger).
**Cost:** needs Foundry/Anvil provisioned in the worker's environment — infrastructure work, not a new failure-mode category to guard against.

### C. Do nothing yet; find out which failure mode actually happened

Given the ADR was prompted by one incident, the cheapest next step might be diagnosing that specific miss before committing to either A or B.

## Recommendation

Not this team's call to finalize, but for what it's worth: **B before A**, and only pursue A with the guardrails above already designed in, not bolted on after.

Reasoning: B is a strict quality improvement with no new failure modes — it fits the existing "finding backed by real evidence" architecture, and it's the direct answer to the honeypot pattern that's the most common real-world rug mechanism. A is genuinely useful for the narrower verified-source-obfuscated-logic case, but it imports a different kind of risk (ungrounded claims, injection surface, non-determinism) into a codebase whose entire design philosophy up to this point (`docs/adr/0007`, `0010`–`0012`) has been "never assert something we can't back with a specific piece of evidence." If A is pursued, its output should land as a clearly-labeled, separately-scored `AI_REVIEW` category — visible, but never silently blended into the deterministic risk score.

## Open question for whoever picks this up

Which failure mode was the actual incident? That answer should probably come before either A or B gets scheduled.
