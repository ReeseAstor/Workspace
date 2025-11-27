class RiskEngine {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger.child({ module: 'risk-engine' });
  }

  _bpsToMultiplier(bps) {
    return bps / 10_000;
  }

  _isFresh(quote) {
    return Date.now() - quote.receivedAt <= this.config.maxQuoteAgeMs;
  }

  _isCurrencyAllowed(currency) {
    if (!currency) return false;
    if (!Array.isArray(this.config.allowedCurrencies) || !this.config.allowedCurrencies.length) {
      return true;
    }
    return this.config.allowedCurrencies.includes(currency.toUpperCase());
  }

  evaluatePair(buyLeg, sellLeg) {
    const issues = [];
    if (!this._isFresh(buyLeg)) issues.push('buy_leg_stale');
    if (!this._isFresh(sellLeg)) issues.push('sell_leg_stale');
    if (buyLeg.currency !== sellLeg.currency) issues.push('currency_mismatch');
    if (!this._isCurrencyAllowed(buyLeg.currency) || !this._isCurrencyAllowed(sellLeg.currency)) {
      issues.push('currency_not_allowed');
    }
    const quantity = Math.min(
      buyLeg.availableUnits || 0,
      sellLeg.availableUnits || 0,
      this.config.maxCardsPerTrade
    );
    if (quantity <= 0) issues.push('no_inventory_overlap');

    const buyMultiplier = 1 +
      this._bpsToMultiplier(buyLeg.feeBps + buyLeg.slippageBps + this.config.networkFeeBps);
    const sellMultiplier = 1 -
      this._bpsToMultiplier(sellLeg.feeBps + sellLeg.slippageBps + this.config.fxSpreadBps);

    const buyCost = buyLeg.price * buyMultiplier;
    const sellProceeds = sellLeg.price * sellMultiplier;
    const netProfitPerUnit = sellProceeds - buyCost;
    const netSpreadBps = buyCost > 0 ? (netProfitPerUnit / buyCost) * 10_000 : 0;
    const grossSpreadBps = buyCost > 0 ? ((sellLeg.price - buyLeg.price) / buyLeg.price) * 10_000 : 0;

    if (netSpreadBps < this.config.profitThresholdBps) {
      issues.push('below_profit_threshold');
    }

    const approved = issues.length === 0 && netProfitPerUnit > 0;

    return {
      approved,
      issues,
      quantity,
      buyCost,
      sellProceeds,
      netProfitPerUnit,
      netSpreadBps,
      grossSpreadBps,
      notional: quantity * buyLeg.price,
      effectiveBuy: buyCost,
      effectiveSell: sellProceeds,
    };
  }

  ensureExecutable(opportunity) {
    const check = this.evaluatePair(opportunity.buyLeg, opportunity.sellLeg);
    if (!check.approved) {
      const error = new Error(`Opportunity ${opportunity.id} failed risk checks: ${check.issues.join(', ')}`);
      error.issues = check.issues;
      throw error;
    }
    return check;
  }
}

module.exports = RiskEngine;
