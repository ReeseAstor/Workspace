class ExecutionEngine {
  constructor({ riskEngine, store, logger, config }) {
    this.riskEngine = riskEngine;
    this.store = store;
    this.logger = logger.child({ module: 'execution-engine' });
    this.config = config;
  }

  async execute(opportunity, requestedQuantity, options = {}) {
    const { requestId, expectedVersion } = options;
    
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

    if (expectedVersion !== undefined) {
      const currentVersion = await this.store.getOpportunityVersion(opportunity.id);
      if (currentVersion.version !== expectedVersion) {
        throw new Error(`Optimistic lock failure: opportunity version changed from ${expectedVersion} to ${currentVersion.version}`);
      }
    }

    const netPerUnit = check.netProfitPerUnit;
    const netTotal = Number((netPerUnit * quantity).toFixed(2));

    const execution = {
      opportunityId: opportunity.id,
      requestId: requestId || null,
      quantity,
      brand: opportunity.brand,
      denomination: opportunity.denomination,
      buyMarket: opportunity.buyLeg.marketName,
      sellMarket: opportunity.sellLeg.marketName,
      buyCost: check.buyCost,
      netProfitPerUnit: Number(netPerUnit.toFixed(2)),
      netProfitTotal: netTotal,
      executedAt: Date.now(),
      status: 'filled',
    };

    await this.store.recordExecution(execution);
    this.logger.info({ execution, requestId }, 'Execution recorded');
    return execution;
  }
}

module.exports = ExecutionEngine;
