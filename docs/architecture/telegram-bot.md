# Telegram Bot

Stage 12 turns the Telegram boundary into a usable command workflow while keeping the bot backed by the same persisted scan contracts as the API and web app.

## Commands

- `/start`: explains the product and lists commands.
- `/help`: shows scan, status, and result usage.
- `/scan <contract address>`: submits a Robinhood Chain token scan.
- `/status <scan id>`: returns persisted scan progress.
- `/result <scan id>`: returns a compact scan result summary.
- `/track <contract address>`: saves a CA to the current Telegram chat watchlist and submits a baseline scan.
- `/tracked`: lists up to 25 CAs tracked by the current Telegram chat.
- `/untrack <contract address>`: removes a CA from the current Telegram chat watchlist.
- Pasted EVM contract addresses are treated like `/scan`.

`/scan` and pasted CAs also auto-add the address to the current chat watchlist when Telegram tracking storage is configured. Tracking is per chat, so private chats and group chats do not share CA lists.

Result messages use a dense bot-report layout with the contract address, risk line, market placeholders, tax placeholders, holder summary, top finding, and inline buttons for `Chart`, `Holders`, `Taxes`, and refresh.

## Result Language

Telegram replies must not claim a token is safe. Result summaries include risk level, score when available, finding counts, top persisted findings, and unsupported check categories.

Unsupported liquidity, holder, or simulation output means that evidence source was not executed. It does not imply that liquidity, ownership distribution, or trade behavior is healthy.

Rows copied from common token bots, such as market cap, tax, LP lock, charts, and holder concentration, must show `N/A` or `Unsupported` unless Genesis Sentinel has persisted evidence for that field.

## Webhook Security

When `TELEGRAM_WEBHOOK_SECRET` is set, `/telegram/webhook` requires Telegram's `x-telegram-bot-api-secret-token` header to match. Production deployments should set the webhook with the same secret token.

## Abuse Controls

Scan submissions are protected by an in-process per-chat/per-user limiter:

- `TELEGRAM_SCAN_COOLDOWN_SECONDS` blocks rapid repeated scan submissions.
- `TELEGRAM_SCAN_BURST_LIMIT` caps scans within the rolling burst window.
- `TELEGRAM_SCAN_BURST_WINDOW_SECONDS` controls that rolling window.

The limiter runs before `/scan`, `/track`, or pasted-address messages enqueue scan jobs. This protects a single bot instance from obvious spam, but it is not a complete public-launch abuse system. Multi-instance deployments should move these counters to Redis or another shared store.

## Remaining Work

- Register BotFather command descriptions.
- Add deployment instructions for setting and rotating the webhook.
- Add shared Redis-backed abuse counters for multi-instance public deployments.
- Add abuse monitoring for repeated scans from the same chat.
- Add scheduled re-scan and alert delivery for tracked CAs.
