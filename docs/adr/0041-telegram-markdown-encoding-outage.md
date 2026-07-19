# ADR 0041: Telegram Bot Silent-Failure Outage — Mis-Encoded Ellipsis

## Status

Accepted. Production hotfix. The user reported pasting a contract address into the Telegram bot
and getting no response at all — not even `/start`. Diagnosed live against the production server
and confirmed the bot had been silently failing on every single reply.

## Diagnosis

Confirmed via production PM2 logs (`genesis-sentinel-api-out.log`) that Telegram's webhook was
correctly registered and delivering updates (`getWebhookInfo` showed the right URL, no
registration problem), but every delivery came back with:

```
GrammyError: Call to 'sendMessage' failed! (400: Bad Request: can't parse entities:
Can't find end of the entity starting at byte offset 619)
```

Cause found in the outgoing message payload: `shortenAddress()` built strings like
`` `0x8cfa…b561` `` for a Markdown code span, but the ellipsis character had been mis-encoded at
some point (UTF-8 bytes for "…" re-interpreted as Latin-1 and re-encoded) into a garbled
multi-byte sequence. That malformed sequence, sitting inside a backtick-delimited code span, broke
Telegram's (legacy) Markdown entity parser. Every scan report includes a deployer or owner
address, so this affected essentially every reply — `/scan`, pasted CAs, `/result`, `Refresh` —
turning the bot completely silent. Telegram's webhook delivery treats a non-2xx response as a
delivery failure and queues retries rather than surfacing anything to the end user, so from the
user's side this looked exactly like "nothing happened," not an error message.

Confirmed this predates this session's Telegram work entirely (unrelated to ADR 0040) — `/start`'s
reply text contains no addresses and should be unaffected by this specific bug, but the user's
report that nothing responded at all suggests it may have been broken for some time and simply
never been exercised/noticed until now.

## Decision

`shortenAddress()` in `apps/api/src/telegram.ts` now uses plain ASCII `...` instead of a unicode
ellipsis — removing any encoding ambiguity entirely rather than trying to re-fix the character
encoding at its source (unknown/unclear where the mis-encoding was introduced).

## Consequences

- Full verification (`pnpm lint`, `typecheck`, `test`, `build`, `prisma:validate`) passed clean.
  New regression test in `apps/api/src/telegram.test.ts` builds a full report containing a
  deployer address and asserts the address-shortening code span is strictly 7-bit ASCII.
- Diagnosed and fixed with direct production access (SSH to the Contabo server, explicitly
  authorized by the user for this investigation) — confirmed via `getWebhookInfo` and PM2 logs
  rather than guessing; no secret values were ever printed into the conversation.
- This class of bug (a non-obvious encoding issue breaking a downstream API's strict parser) has
  no automated guard beyond the new regression test — worth keeping in mind that any future
  Telegram message formatting change should avoid non-ASCII punctuation in code spans unless
  verified against Telegram's actual parser behavior.

## Follow-up: second root cause (same outage, same file)

This ellipsis fix alone did not fully resolve the outage. The `shortenAddress()` bug only broke
replies containing an address, but a second, broader corruption existed in the same file: every
emoji literal used for risk levels and section headers (`riskEmoji`, `severityEmoji`, and others,
~15 call sites) had the identical mis-encoding pattern — UTF-8 bytes for the emoji re-interpreted
as **Windows-1252** (not plain Latin-1; confirmed via byte-level analysis, since the corruption
included codepoints only reachable through the CP1252 mapping) and re-saved as UTF-8. This meant
essentially every reply, address or not, still hit Telegram's `can't parse entities` failure after
the first fix deployed.

Fixed by reversing the exact CP1252 mis-encoding across the whole file. The first pass of that
reversal was too broad — a codepoint-range regex swept up a few already-correct characters
elsewhere in the file (an em dash and a middle dot used in comments and separators), corrupting
them into replacement characters. Caught by a full-file scan for stray replacement characters
before verification, and hand-corrected. Full verification (`lint`, `typecheck`, `test`, `build`,
`prisma:validate`) passed clean after both passes.

Lesson: when a mis-encoding is found in one string in a file, grep the whole file for the same
byte pattern before considering the fix complete — don't assume the corruption is isolated to the
one string that happened to crash first.

## Follow-up: third root cause (same outage, same file)

Redeploying the emoji fix and checking production logs directly (SSH, PM2 logs) showed replies
were *still* failing with the identical `can't parse entities` error, now at a different byte
offset, and with the emoji rendering correctly this time — proof the second fix worked but did not
fully resolve the outage. The payload text pointed at `PARTIALLY_COMPLETED`: `ScanState` values
(`RESOLVING_CHAIN`, `ANALYZING_CONTRACT`, `PARTIALLY_COMPLETED`, etc.) and the `UNABLE_TO_ASSESS`
`RiskLevel` value all contain literal underscores, which legacy Telegram Markdown treats as
unescaped italic delimiters regardless of word-boundary context. An odd total count of unescaped
underscores across the message (state, or state plus risk level, depending on which fields are
present) makes Telegram unable to find a closing entity, rejecting the whole message.

The file already had an `escapeMarkdown()` helper used for other dynamic fields (finding titles,
holder/progress messages) — `scan.state` and `risk.level` were simply never routed through it at
three call sites (`formatTelegramScanReply`, `formatTelegramProgressReply`, `formatRiskLine`).
Fixed by wrapping all three in `escapeMarkdown()`. Added a regression test asserting the full
reply has a balanced (even) count of unescaped `_`, `*`, and `` ` `` characters — a general check
that would have caught this bug and would catch a similar one in any other enum interpolated into
Markdown text going forward, rather than a test pinned to one specific value.

Verified fixed live: after this third fix deployed, the exact address that previously reproduced
the crash on production (byte offset 607, `PARTIALLY_COMPLETED`/`UNABLE_TO_ASSESS` combination)
was re-tested via SSH-confirmed PM2 logs with no further `can't parse entities` errors.

Lesson: an `escapeMarkdown()` helper existing in a file is not a guarantee every dynamic value is
routed through it — grep every raw `${...}` interpolation feeding a Markdown-formatted message
for enum-typed values, not just free-text ones, since `_` is a common character in TypeScript
union-type string literals and is easy to overlook as "safe" because it's not user-supplied text.
