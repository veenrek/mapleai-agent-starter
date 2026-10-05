# Agent instructions — MapleAI Agent Starter

Same content as `CLAUDE.md` — kept as a separate file for agent runtimes
that read `AGENTS.md` (OpenAI Codex, Cursor legacy, others).

## TL;DR

- API: MapleAI x402 paid LLM endpoints, USDC on Solana/Base/Polygon/Arc.
- Free entry: `POST {origin}/v1/embeddings` (2048-dim, no key).
- Paid entry: `POST {origin}/prepaid/codes/auto` — one x402 payment mints an `oms_buy_...` key
  for the cheapest combo; use it as `Authorization: Bearer`.
- Spend the key (no x402): `POST {origin}/prepaid/v1/chat/completions` on the same gateway
  (any `/prepaid/v1/*` subpath forwards), or apex `POST https://mapleai.shop/v1/chat/completions`.
- Key status (free): `GET {origin}/prepaid/status` or `GET https://mapleai.shop/v1/prepaid/status`.
- Chat: `model` field = combo name from key status (`allowedModels`).
- Live catalog/prices: `GET {origin}/v1/models`; worked examples: `GET {origin}/openapi.json`.
- Payment flow details and safety caps: see `CLAUDE.md`.
- Working paid client code: `src/scenario.mjs` (`npm run scenario -- --network base|solana`).
- Free CI smoke: `npm run smoke` (no secrets required).

## Commands

- `npm install` — install x402 client deps
- `npm run smoke` — free checks of all 4 gateways (catalog, embeddings, discovery, 402 shape)
- `npm run scenario -- --network base` — full paid path (needs `EVM_PRIVATE_KEY`)
- `npm run scenario -- --network solana` — same on Solana (needs `SVM_PRIVATE_KEY`)

## MCP

`.mcp.json` wires the `mapleai-mcp` server (tools: list_models, embed_text, prepaid_status,
chat_completion, jev_decide, agent_execute, buy_prepaid_tap, prepaid_chat). Keep keys in env, never in the file.
