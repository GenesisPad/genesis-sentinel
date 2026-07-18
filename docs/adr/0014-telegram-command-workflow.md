# ADR 0014: Telegram Command Workflow

## Status

Accepted

## Context

Genesis Sentinel needs a Telegram surface that uses the same persisted scan data as the API and web app. The initial Telegram boundary could submit scans but could not check progress or summarize results.

## Decision

Stage 12 adds `/status` and `/result` commands, improves `/start` and `/help`, keeps pasted-address scan submission, and validates an optional Telegram webhook secret token.

The next Telegram increment adds per-chat CA tracking on top of the existing watchlist tables. `/track <contract address>` stores a CA for the current chat and submits a baseline scan. `/tracked` lists saved CAs, `/untrack <contract address>` removes one, and `/scan` or pasted CAs auto-add the CA when tracking storage is configured.

Telegram result formatting is intentionally compact and conservative. It reports persisted risk, finding counts, top findings, and unsupported check categories without claiming guarantees.

## Consequences

- Telegram users can submit scans and retrieve useful results without leaving the chat.
- Telegram chats can retain a compact watchlist of CAs instead of relying on old scan IDs.
- The bot remains aligned with the same scan repository contracts as REST and web.
- Public bot launch still requires webhook setup, BotFather command registration, monitoring, and abuse controls.
