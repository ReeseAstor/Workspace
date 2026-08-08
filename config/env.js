require('dotenv').config();

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const toInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toList = (value, fallback = []) => {
  if (!value) return fallback;
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const config = {
  port: toInt(process.env.PORT, 3000),
  logLevel: process.env.LOG_LEVEL || 'info',
  logPretty: toBool(process.env.LOG_PRETTY, false),
  landingPageUsername: process.env.LANDING_PAGE_USERNAME || 'admin',
  landingPagePassword: process.env.LANDING_PAGE_PASSWORD || undefined,
  allowedRegions: toList(process.env.ALLOWED_REGIONS, ['US']).map((region) => region.toUpperCase()),
  allowedCurrencies: toList(process.env.ALLOWED_CURRENCIES, ['USD']).map((currency) => currency.toUpperCase()),
  profitThresholdBps: toInt(process.env.PROFIT_THRESHOLD_BPS, 75),
  maxQuoteAgeMs: toInt(process.env.MAX_QUOTE_AGE_MS, 4_500),
  fxSpreadBps: toInt(process.env.FX_SPREAD_BPS, 15),
  networkFeeBps: toInt(process.env.NETWORK_FEE_BPS, 10),
  defaultCardQuantity: toInt(process.env.DEFAULT_CARD_QUANTITY, 5),
  maxCardsPerTrade: toInt(process.env.MAX_CARDS_PER_TRADE, 25),
  executionHoldTimeoutMs: toInt(process.env.EXECUTION_HOLD_TIMEOUT_MS, 2_500),
  sseHeartbeatMs: toInt(process.env.SSE_HEARTBEAT_MS, 15_000),
  maxOpportunitiesTracked: toInt(process.env.MAX_OPPORTUNITIES_TRACKED, 50),
  sqlitePath: process.env.SQLITE_DB_PATH || './arbitrage.db',
  enableMockMarkets: toBool(process.env.ENABLE_MOCK_MARKETS, false),
  
  // Portfolio-level risk controls
  maxDailyExecutions: toInt(process.env.MAX_DAILY_EXECUTIONS, 100),
  maxDailyNotional: toInt(process.env.MAX_DAILY_NOTIONAL, 50000),
  maxPositionPerBrand: toInt(process.env.MAX_POSITION_PER_BRAND, 500),
  maxTotalExposure: toInt(process.env.MAX_TOTAL_EXPOSURE, 100000),
  maxLossPerDay: toInt(process.env.MAX_LOSS_PER_DAY, 5000),
  cooldownAfterLossMs: toInt(process.env.COOLDOWN_AFTER_LOSS_MS, 300000),
  
  // Optimistic locking
  executionLockTimeoutMs: toInt(process.env.EXECUTION_LOCK_TIMEOUT_MS, 5000),
};

module.exports = Object.freeze(config);