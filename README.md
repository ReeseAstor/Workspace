# Digital Gift Card Arbitrage Platform

Production-grade Node.js platform for monitoring digital gift card venues, validating zero-risk spreads, and orchestrating simultaneous buy/sell execution.

## Capabilities
- **Market ingestion** – pluggable connectors (HTTP APIs or secure partner streams) normalize quotes for every brand/denomination.
- **Real-time analytics** – in-memory order books + deterministic arbitrage engine evaluate every update with configurable profit, FX, and network fee buffers.
- **Risk controls** – freshness checks, fee-aware PnL math, opportunity deduplication, and SQLite-backed audit trail for opportunities and fills.
- **Execution workflow** – REST endpoint to trigger trades after revalidation; hooks ready for integrating reservation/settlement flows per venue.
- **Operations dashboard** – SSE-driven control room showing market health, executable spreads, order books, and execution log (no demo data injected).
- **Jurisdiction gating** – environment allowlists enforce US-only venues and USD-only pricing out of the box, keeping the platform compliant with domestic mandates.

## System Architecture
```
Market APIs/WebSockets --> Marketplace Connectors --> Kafka-like bus (EventEmitter)
                                          |                 \
                                          v                  \
                               Price Cache (per brand/denom)   \
                                          |                    --> SSE / REST
                                          v
                                Arbitrage Engine --> Risk Engine --> Execution Engine --> Audit Store
```
- **Connectors**: `config/marketplaces.js` loads each venue from environment variables (adapter type, URL, auth token, polling interval, fees). Optional mock connectors can be enabled for local testing via `ENABLE_MOCK_MARKETS=true`.
- **Price cache**: `src/services/priceCache.js` keeps best bids/asks per venue, purges stale quotes per `MAX_QUOTE_AGE_MS`, and emits snapshots downstream.
- **Arbitrage engine**: deterministic IDs per `(brand, denom, buyVenue, sellVenue)` prevent duplicate work and ensure UI/API consistency.
- **Risk engine**: applies venue fees, FX spread, and network costs, guaranteeing only truly risk-free spreads (net spread ≥ `PROFIT_THRESHOLD_BPS`).
- **Execution engine**: re-runs risk checks at commit time, records fills in SQLite (`src/storage/sqliteStore.js`), and emits audit SSE events.

## Getting Started
1. Install dependencies
   ```bash
   npm install
   ```
2. Copy and edit environment variables
   ```bash
   cp .env.example .env
   ```
3. Define at least one sell-side and one buy-side marketplace by exporting `MKT_<NAME>_*` variables (examples in `.env.example`).
4. Optional: set `ENABLE_MOCK_MARKETS=true` for local dry runs.
5. Start the platform
   ```bash
   npm start
   ```
6. Open `http://localhost:3000` for the live dashboard.

## Key Environment Flags
| Variable | Description |
| --- | --- |
| `PORT` | HTTP/SSE server port (default 3000). |
| `PROFIT_THRESHOLD_BPS` | Minimum net spread required to surface an opportunity. |
| `MAX_QUOTE_AGE_MS` | Quotes older than this are discarded. |
| `ALLOWED_REGIONS` | Comma-separated ISO country/region codes (default `US`). |
| `ALLOWED_CURRENCIES` | Comma-separated ISO currency codes (default `USD`). |
| `FX_SPREAD_BPS` / `NETWORK_FEE_BPS` | Global fee cushions added to venue fees. |
| `MAX_CARDS_PER_TRADE` | Hard cap per execution request. |
| `SQLITE_DB_PATH` | Audit database location. |
| `ENABLE_MOCK_MARKETS` | Enables synthetic connectors for development only. |

Marketplace variables follow the pattern `MKT_<IDENTIFIER>_*`. Important keys include `SIDE` (`sell`/`buy`), `URL`, `TOKEN`, `POLL_MS`, `FEE_BPS`, `SLIPPAGE_BPS`, `CURRENCY`, and `BRANDS` (comma-separated list).

## API Surface
| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Service heartbeat + current metrics. |
| `GET` | `/api/markets` | Market connector health (latency, status). |
| `GET` | `/api/books` | Consolidated best bids/asks per brand. |
| `GET` | `/api/opportunities` | Current validated arbitrage opportunities. |
| `GET` | `/api/executions` | Recent fills from SQLite audit log. |
| `POST` | `/api/opportunities/:id/execute` | Re-validate and trigger execution for a specific spread. |
| `GET` | `/api/stream` | Server-Sent Events feed broadcasting opportunities, market health, metrics, and execution outcomes. |

All responses are JSON; errors respond with `{ error, details }` payloads.

## Dashboard
The SPA in `public/` subscribes to `/api/stream` and surfaces:
- **Connectivity**: venue health, latency, and recent errors.
- **Executable spreads**: net spread (bps), profit per card, route context, and on-click execution with user-provided quantity.
- **Order books**: top-of-book snapshots for each configured brand/denomination pair.
- **Execution audit**: time-stamped route + realized profit logged from SQLite.

## Extending the Platform
- Implement partner-specific connectors by extending `src/services/marketplaceConnectors/baseConnector.js` (e.g., add FIX/WebSocket adapters).
- Replace SQLite with CockroachDB/PostgreSQL by adding a new store that implements `recordOpportunity`, `recordExecution`, and `getRecentExecutions`.
- Wire the `ExecutionEngine` into actual marketplace reservation APIs; the abstraction already expects simultaneous holds and can broadcast execution status downstream.
- Integrate messaging/alerting (PagerDuty, Slack) by subscribing to the orchestrator events in `server.js`.

## License
MIT
