# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project Overview

This is the **88Away LLC Workspace** — a Node.js/Express platform that runs autonomous AI "agents" for digital business operations. The codebase contains several related modules:

- **Gift card arbitrage engine** (`package.json` name: `gift-card-arbitrage-platform`) – real-time price tracking, risk validation, and execution orchestration across marketplaces.
- **88Away AI Premium Agents** – KDP (Kindle Direct Publishing) and affiliate-marketing tracking agents coordinated by `src/services/businessOrchestrator.js`, with Qwen/Anthropic/OpenAI-powered insights.
- **Integrations** – Supabase, Notion, and Google Drive service wrappers in `services/` (see `INTEGRATION_SETUP.md`).
- **KDP cover tracker** – a standalone Python analysis tool in `kdp-cover-tracker/`.

The entry point is `server.js`, which starts the Express app, the `BusinessOrchestrator`, and a Server-Sent Events (SSE) stream consumed by the dashboard in `public/`.

## Tech Stack

- **Runtime:** Node.js (16+), CommonJS modules (`require`/`module.exports`)
- **Server:** Express 4 with `helmet`, `cors`, `compression`, `body-parser`
- **Storage:** SQLite (`sqlite3`) via `src/storage/sqliteStore.js`; optional Supabase migration in `migrations/`
- **AI SDKs:** `@anthropic-ai/sdk`, `openai` (used for Qwen via DashScope-compatible APIs)
- **Frontend:** Vanilla HTML/CSS/JS single-page dashboard in `public/`
- **Python:** `kdp-cover-tracker/analyze_covers.py` (stdlib only, Python 3)

## Repository Structure

```
server.js                  # Express entry point: REST routes, SSE stream, graceful shutdown
config/
  env.js                   # Central env parsing (frozen config object)
  integrations.js          # Supabase/Notion/Google Drive config
  marketplaces.js          # Marketplace connector loading from MKT_* env vars
src/
  logger.js                # Pino logger
  services/                # Domain agents: businessOrchestrator, kdpAgent, affiliateAgent,
                           # arbitrageEngine, riskEngine, executionEngine, priceCache,
                           # qwenAIAgent, premiumQwenAgent, marketIntelligenceAgent,
                           # contentPipelineAgent, revenueOptimizerAgent, firecrawlAgent
  services/marketplaceConnectors/  # baseConnector, httpConnector, mockConnector
  storage/sqliteStore.js   # SQLite audit store
services/                  # External integrations (Supabase, Notion, Google Drive)
migrations/                # Supabase schema + SQLite→Supabase migration script
public/                    # Dashboard SPA (index.html, script.js, styles.css)
kdp-cover-tracker/         # Standalone Python cover-dimension analysis tool
```

## Setup, Build, and Run

```bash
npm install                 # install dependencies
cp .env.example .env        # configure environment (see below)
npm start                   # start the server (alias: npm run dev)
```

- Dashboard: `http://localhost:3000`
- Health check: `GET /health`
- There is **no build step** (plain Node.js + static frontend) and **no test suite** — `npm test` is a placeholder that exits 0.
- Python tool: `python3 kdp-cover-tracker/analyze_covers.py` (expects a `covers.json` data file).

## Environment Configuration

All configuration is environment-driven; **never hardcode credentials**. Copy `.env.example` to `.env` (gitignored). Key groups:

- **Server/risk:** `PORT`, `LOG_LEVEL`, `PROFIT_THRESHOLD_BPS`, `MAX_QUOTE_AGE_MS`, `FX_SPREAD_BPS`, `NETWORK_FEE_BPS`, `MAX_CARDS_PER_TRADE`
- **Jurisdiction gating:** `ALLOWED_REGIONS` (default `US`), `ALLOWED_CURRENCIES` (default `USD`)
- **Storage:** `SQLITE_DB_PATH`
- **Marketplaces:** `MKT_<NAME>_*` pattern (`SIDE`, `URL`, `TOKEN`, `POLL_MS`, `FEE_BPS`, `SLIPPAGE_BPS`, `CURRENCY`, `BRANDS`); `ENABLE_MOCK_MARKETS=true` enables synthetic connectors for local dev only
- **AI:** `DASHSCOPE_API_KEY`, `AI_DEFAULT_MODEL`, token/budget limits (see `AI_AGENTS_CONFIG.md`)
- **Integrations:** `SUPABASE_*`, `NOTION_*`, `GOOGLE_*` (see `INTEGRATION_SETUP.md`)

## Coding Conventions

- **CommonJS only** — use `require(...)` and `module.exports`; do not introduce ESM or TypeScript.
- Class-based agents/services (e.g., `class BusinessOrchestrator`) with private methods prefixed by underscore (`_fetchKDPData`).
- Structured logging via the shared Pino logger (`src/logger.js`); use `logger.info({ ... }, 'message')` style — no `console.log`.
- Env parsing helpers (`toBool`, `toInt`, `toList`) live in `config/env.js`; add new config there rather than reading `process.env` directly in services.
- Error responses use `{ error, details }` JSON payloads; the central Express error handler lives at the bottom of `server.js`.
- Real-time updates flow through the SSE broadcast helpers in `server.js` (`broadcast(event, payload)`).

## Testing & Validation

- No automated tests exist. After making changes, validate by starting the server (`npm start`) and exercising `/health` and relevant `/api/*` endpoints.
- Set `ENABLE_MOCK_MARKETS=true` for safe local dry runs without real marketplace credentials.

## Safety & Security Rules for Agents

- **Never commit secrets**: `.env` and all API keys/tokens must stay out of version control (`.gitignore` already covers `.env*`).
- Keep `ENABLE_MOCK_MARKETS` and demo/mock data paths **off** in production paths.
- Preserve the jurisdiction/region gating (`ALLOWED_REGIONS`, `ALLOWED_CURRENCIES`) — it is a compliance control, not an optional filter.
- The arbitrage execution path re-validates risk checks at commit time; do not bypass the risk engine when modifying execution code.
- `config/env.js` exports a frozen object — do not mutate config at runtime.

## Key Documentation

- `README.md` – arbitrage platform architecture and API surface
- `README_88AWAY.md` – 88Away agents platform (KDP/affiliate) endpoints and examples
- `AI_AGENTS_CONFIG.md`, `QWEN_AI_SETUP.md`, `PREMIUM_AI_PLATFORM.md` – AI agent configuration
- `INTEGRATION_SETUP.md` – Supabase/Notion/Google Drive setup
- `FIRECRAWL_INTEGRATION.md`, `BUSINESS_LOGIC_ENHANCEMENTS.md`, `STRATEGY_88AWAY.md` – feature-specific deep dives
