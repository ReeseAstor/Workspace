class ArbitrageEngine {
  constructor({ riskEngine, config, logger }) {
    this.riskEngine = riskEngine;
    this.config = config;
    this.logger = logger.child({ module: 'arbitrage-engine' });
  }

  evaluate(orderBooks) {
    const opportunities = [];

    orderBooks.forEach((book) => {
      const bestSource = book.sell[0]; // we buy from sell-side venues
      const bestDestination = book.buy[0]; // we sell into buy-side venues
      if (!bestSource || !bestDestination) return;
      if (bestSource.marketId === bestDestination.marketId) return;

      const riskResult = this.riskEngine.evaluatePair(bestSource, bestDestination);
      if (!riskResult.approved) {
        return;
      }

      opportunities.push({
        id: `${book.brand.toLowerCase()}-${book.denomination}-${bestSource.marketId}-${bestDestination.marketId}`,
        brand: book.brand,
        denomination: book.denomination,
        buyLeg: bestSource,
        sellLeg: bestDestination,
        quantity: riskResult.quantity,
        metrics: {
          netProfitPerUnit: Number(riskResult.netProfitPerUnit.toFixed(2)),
          netSpreadBps: Number(riskResult.netSpreadBps.toFixed(2)),
          grossSpreadBps: Number(riskResult.grossSpreadBps.toFixed(2)),
          notional: Number((riskResult.notional || 0).toFixed(2)),
        },
        createdAt: Date.now(),
        status: 'open',
        validations: {
          issues: riskResult.issues,
        },
      });
    });

    return opportunities
      .sort((a, b) => b.metrics.netSpreadBps - a.metrics.netSpreadBps)
      .slice(0, this.config.maxOpportunitiesTracked);
  }
}

module.exports = ArbitrageEngine;
