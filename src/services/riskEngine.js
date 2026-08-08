class RiskEngine {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger.child({ module: 'risk-engine' });
    this.dailyStats = {
      executions: 0,
      notional: 0,
      pnl: 0,
      lastReset: Date.now(),
    };
    this.brandPositions = new Map();
    this.lastLossTime = null;
  }

  _resetDailyStatsIfNeeded() {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    if (now - this.dailyStats.lastReset > dayMs) {
      this.dailyStats = { executions: 0, notional: 0, pnl: 0, lastReset: now };
      this.brandPositions.clear();
      this.logger.info('Daily portfolio stats reset');
    }
  }

  _isInCooldown() {
    if (!this.lastLossTime) return false;
    const now = Date.now();
    return now - this.lastLossTime < this.config.cooldownAfterLossMs;
  }

  _updateBrandPosition(brand, quantity, price) {
    const existing = this.brandPositions.get(brand) || { units: 0, exposure: 0 };
    existing.units += quantity;
    existing.exposure += quantity * price;
    this.brandPositions.set(brand, existing);
  }

  checkPortfolioLimits(execution) {
    this._resetDailyStatsIfNeeded();

    const issues = [];
    const notional = execution.quantity * execution.buyCost;

    if (this.dailyStats.executions >= this.config.maxDailyExecutions) {
      issues.push('daily_execution_limit_reached');
    }

    if (this.dailyStats.notional + notional > this.config.maxDailyNotional) {
      issues.push('daily_notional_limit_reached');
    }

    if (this.dailyStats.pnl < -this.config.maxLossPerDay) {
      issues.push('daily_loss_limit_reached');
    }

    if (this._isInCooldown()) {
      issues.push('in_cooldown_after_loss');
    }

    const brandPosition = this.brandPositions.get(execution.brand) || { units: 0, exposure: 0 };
    if (brandPosition.units + execution.quantity > this.config.maxPositionPerBrand) {
      issues.push('brand_position_limit_reached');
    }

    let totalExposure = 0;
    this.brandPositions.forEach((pos) => {
      totalExposure += pos.exposure;
    });
    if (totalExposure + notional > this.config.maxTotalExposure) {
      issues.push('total_exposure_limit_reached');
    }

    return {
      approved: issues.length === 0,
      issues,
      currentStats: { ...this.dailyStats },
      brandPosition,
    };
  }

  recordExecutionResult(execution) {
    this._resetDailyStatsIfNeeded();
    this.dailyStats.executions += 1;
    this.dailyStats.notional += execution.quantity * execution.buyCost;
    this.dailyStats.pnl += execution.netProfitTotal;

    this._updateBrandPosition(execution.brand, execution.quantity, execution.buyCost);

    if (execution.netProfitTotal < 0) {
      this.lastLossTime = Date.now();
      this.logger.warn({ execution, dailyPnl: this.dailyStats.pnl }, 'Loss recorded, entering cooldown');
    }
  }

  getPortfolioStats() {
    this._resetDailyStatsIfNeeded();
    const totalExposure = Array.from(this.brandPositions.values()).reduce(
      (sum, pos) => sum + pos.exposure,
      0
    );

    return {
      daily: { ...this.dailyStats },
      brandPositions: Array.from(this.brandPositions.entries()).map(([brand, pos]) => ({
        brand,
        ...pos,
      })),
      totalExposure,
      inCooldown: this._isInCooldown(),
      lastLossTime: this.lastLossTime,
    };
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
