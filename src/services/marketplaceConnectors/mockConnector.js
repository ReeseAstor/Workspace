const MarketplaceConnector = require('./baseConnector');

class MockMarketplaceConnector extends MarketplaceConnector {
  constructor(config, logger) {
    super(config, logger);
  }

  async fetchQuotes() {
    const quotes = this.config.supportedBrands.map((brand) => {
      const denom = [25, 50, 100, 200][Math.floor(Math.random() * 4)];
      const basePrice = denom * (this.config.side === 'sell' ? 0.92 : 0.98);
      const jitter = (Math.random() - 0.5) * 2;
      const price = Number((basePrice + jitter).toFixed(2));
      const receivedAt = Date.now();
      return {
        id: `${this.config.id}-${brand}-${denom}-${receivedAt}`,
        marketId: this.config.id,
        marketName: this.config.name,
        side: this.config.side,
        brand,
        denomination: denom,
        currency: this.config.currency,
        price,
        availableUnits: Math.floor(Math.random() * 25) + 1,
        minPurchaseQty: 1,
        maxPurchaseQty: null,
        feeBps: this.config.feeBps,
        slippageBps: this.config.slippageBps,
        receivedAt,
        venueTimestamp: receivedAt,
      };
    });
    return quotes;
  }
}

module.exports = MockMarketplaceConnector;
