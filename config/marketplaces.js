const { z } = require('zod');
const env = require('./env');

const boolFromEnv = (value, fallback = true) => {
  if (value === undefined || value === null) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const listFromEnv = (value) => {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const baseSchema = z.object({
  id: z.string(),
  name: z.string(),
  side: z.enum(['buy', 'sell']),
  adapter: z.enum(['http', 'mock']).default('http'),
  enabled: z.boolean().default(true),
  baseUrl: z.string().url().optional(),
  token: z.string().optional(),
  pollingIntervalMs: z.number().min(500).default(2_000),
  timeoutMs: z.number().min(500).default(3_500),
  feeBps: z.number().nonnegative().default(0),
  slippageBps: z.number().nonnegative().default(0),
  currency: z.string().length(3).default('USD'),
  region: z.string().length(2).default('US'),
  supportedBrands: z.array(z.string()).min(1),
});

const extractMarketplacePrefixes = () => {
  const prefixes = new Set();
  Object.keys(process.env).forEach((key) => {
    const match = key.match(/^MKT_[A-Z0-9]+/);
    if (match) {
      prefixes.add(match[0]);
    }
  });
  return Array.from(prefixes.values());
};

const buildConfigFromEnv = (prefix) => {
  const envKey = (suffix) => process.env[`${prefix}_${suffix}`];
  const raw = {
    id: prefix.replace('MKT_', '').toLowerCase(),
    name: envKey('NAME') || prefix,
    side: (envKey('SIDE') || 'sell').toLowerCase(),
    adapter: (envKey('ADAPTER') || 'http').toLowerCase(),
    enabled: boolFromEnv(envKey('ENABLED'), true),
    baseUrl: envKey('URL'),
    token: envKey('TOKEN'),
    pollingIntervalMs: parseInt(envKey('POLL_MS') || '2000', 10),
    timeoutMs: parseInt(envKey('TIMEOUT_MS') || '3500', 10),
    feeBps: parseInt(envKey('FEE_BPS') || '0', 10),
    slippageBps: parseInt(envKey('SLIPPAGE_BPS') || '0', 10),
    currency: (envKey('CURRENCY') || 'USD').toUpperCase(),
    region: (envKey('REGION') || 'US').toUpperCase(),
    supportedBrands: listFromEnv(envKey('BRANDS')),
  };

  if (!raw.baseUrl && raw.adapter === 'http') {
    return null;
  }

  if (!raw.supportedBrands.length) {
    return null;
  }

  const parsed = baseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid marketplace configuration for ${prefix}: ${parsed.error.message}`);
  }

  const data = parsed.data;
  if (
    env.allowedRegions.length &&
    !env.allowedRegions.includes(data.region.toUpperCase())
  ) {
    console.warn(`Skipping ${prefix}: region ${data.region} not allowed`);
    return null;
  }
  if (
    env.allowedCurrencies.length &&
    !env.allowedCurrencies.includes(data.currency.toUpperCase())
  ) {
    console.warn(`Skipping ${prefix}: currency ${data.currency} not allowed`);
    return null;
  }

  return data;
};

const mockMarkets = (
  env.enableMockMarkets
    ? [
        {
          id: 'mock-sell-001',
          name: 'Mock Seller Desk',
          side: 'sell',
          adapter: 'mock',
          enabled: true,
          pollingIntervalMs: 1_000,
          timeoutMs: 500,
          feeBps: 20,
          slippageBps: 5,
          currency: 'USD',
          region: 'US',
          supportedBrands: ['Amazon', 'Apple', 'PlayStation'],
        },
        {
          id: 'mock-buy-001',
          name: 'Mock Buyback Pool',
          side: 'buy',
          adapter: 'mock',
          enabled: true,
          pollingIntervalMs: 1_000,
          timeoutMs: 500,
          feeBps: 15,
          slippageBps: 5,
          currency: 'USD',
          region: 'US',
          supportedBrands: ['Amazon', 'Apple', 'PlayStation'],
        },
      ]
    : []
);

const marketplaceConfigs = [
  ...extractMarketplacePrefixes()
    .map((prefix) => {
      try {
        return buildConfigFromEnv(prefix);
      } catch (err) {
        console.error(err.message);
        return null;
      }
    })
    .filter(Boolean),
  ...mockMarkets,
];

module.exports = marketplaceConfigs;
