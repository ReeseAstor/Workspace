const axios = require('axios');
const { z } = require('zod');
const MarketplaceConnector = require('./baseConnector');

const quoteSchema = z.object({
  brand: z.string(),
  denomination: z.number().nonnegative(),
  currency: z.string().length(3).default('USD'),
  price: z.number().positive(),
  available: z.number().int().nonnegative().default(0),
  side: z.enum(['buy', 'sell']).optional(),
  timestamp: z.union([z.string(), z.number()]).optional(),
  minPurchaseQty: z.number().int().positive().optional(),
  maxPurchaseQty: z.number().int().positive().optional(),
});

class HttpMarketplaceConnector extends MarketplaceConnector {
  constructor(config, logger) {
    super(config, logger);
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeoutMs,
    });
  }

  async fetchQuotes() {
    const headers = {};
    if (this.config.token) {
      headers.Authorization = `Bearer ${this.config.token}`;
    }

    const response = await this.client.get('', { headers });
    const payload = Array.isArray(response.data)
      ? response.data
      : Array.isArray(response.data?.quotes)
      ? response.data.quotes
      : [];

    const normalized = payload
      .map((item) => {
        const parsed = quoteSchema.safeParse(item);
        if (!parsed.success) {
          this.logger.warn({ err: parsed.error.message }, 'Dropping malformed quote');
          return null;
        }
        const quote = parsed.data;
        if (!this.config.supportedBrands.includes(quote.brand)) {
          return null;
        }
        const receivedAt = Date.now();
        return {
          id: `${this.config.id}-${quote.brand}-${quote.denomination}-${receivedAt}`,
          marketId: this.config.id,
          marketName: this.config.name,
          side: quote.side || this.config.side,
          brand: quote.brand,
          denomination: quote.denomination,
          currency: quote.currency,
          price: quote.price,
          availableUnits: quote.available,
          minPurchaseQty: quote.minPurchaseQty || 1,
          maxPurchaseQty: quote.maxPurchaseQty || null,
          feeBps: this.config.feeBps,
          slippageBps: this.config.slippageBps,
          receivedAt,
          venueTimestamp: quote.timestamp ? new Date(quote.timestamp).getTime() : receivedAt,
        };
      })
      .filter(Boolean);

    return normalized;
  }
}

module.exports = HttpMarketplaceConnector;
