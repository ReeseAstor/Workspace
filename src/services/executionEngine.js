class ExecutionEngine {
  constructor({ riskEngine, store, logger, config }) {
    this.riskEngine = riskEngine;
    this.store = store;
    this.logger = logger.child({ module: 'execution-engine' });
    this.config = config;
  }

  async execute(opportunity, requestedQuantity) {
    const quantity = Math.min(
      requestedQuantity || this.config.defaultCardQuantity,
      opportunity.quantity,
      this.config.maxCardsPerTrade
    );
    if (quantity <= 0) {
      throw new Error('Requested quantity is not executable');
    }
    const check = this.riskEngine.evaluatePair(opportunity.buyLeg, opportunity.sellLeg);
    if (!check.approved) {
      throw new Error(`Opportunity failed risk validation: ${check.issues.join(', ')}`);
    }

    const netPerUnit = check.netProfitPerUnit;
    const netTotal = Number((netPerUnit * quantity).toFixed(2));

    const execution = {
      opportunityId: opportunity.id,
      quantity,
      brand: opportunity.brand,
      denomination: opportunity.denomination,
      buyMarket: opportunity.buyLeg.marketName,
      sellMarket: opportunity.sellLeg.marketName,
      netProfitPerUnit: Number(netPerUnit.toFixed(2)),
      netProfitTotal: netTotal,
      executedAt: Date.now(),
      status: 'filled',
    };

    await this.store.recordExecution(execution);
    this.logger.info({ execution }, 'Execution recorded');
    return execution;
  }
}

module.exports = ExecutionEngine;
