const EventEmitter = require('events');
const crypto = require('crypto');
const config = require('../../config/env');
const marketplaceConfigs = require('../../config/marketplaces');
const logger = require('../logger');
const PriceCache = require('./priceCache');
const RiskEngine = require('./riskEngine');
const ArbitrageEngine = require('./arbitrageEngine');
const ExecutionEngine = require('./executionEngine');
const SqliteStore = require('../storage/sqliteStore');
const HttpConnector = require('./marketplaceConnectors/httpConnector');
const MockConnector = require('./marketplaceConnectors/mockConnector');

class GiftCardOrchestrator extends EventEmitter {
  constructor() {
    super();
    this.logger = logger.child({ module: 'orchestrator' });
    this.priceCache = new PriceCache(config.maxQuoteAgeMs);
    this.store = new SqliteStore(config.sqlitePath, this.logger);
    this.riskEngine = new RiskEngine(config, this.logger);
    this.arbEngine = new ArbitrageEngine({ riskEngine: this.riskEngine, config, logger: this.logger });
    this.executionEngine = new ExecutionEngine({
      riskEngine: this.riskEngine,
      store: this.store,
      logger: this.logger,
      config,
    });
    this.connectors = [];
    this.opportunities = new Map();
    this.marketHealth = {};
    this.booksSnapshot = [];
    this.requestCorrelations = new Map();
    
    this.priceCache.on('updated', (snapshot) => {
      this.booksSnapshot = snapshot;
      this._evaluateOpportunities();
    });
  }

  async start() {
    await this.store.initialize();
    this._bootstrapConnectors();
    await Promise.all(this.connectors.map((connector) => connector.start()));
    this.logger.info({ totalConnectors: this.connectors.length }, 'Orchestrator online');
  }

  _generateRequestId() {
    return crypto.randomUUID();
  }

  _trackRequest(requestId, context) {
    const correlation = {
      requestId,
      ...context,
      startTime: Date.now(),
      status: 'pending',
    };
    this.requestCorrelations.set(requestId, correlation);
    
    setTimeout(() => {
      this.requestCorrelations.delete(requestId);
    }, 300000);
    
    return correlation;
  }

  _updateRequestStatus(requestId, status, result = null) {
    const correlation = this.requestCorrelations.get(requestId);
    if (correlation) {
      correlation.status = status;
      correlation.endTime = Date.now();
      correlation.durationMs = correlation.endTime - correlation.startTime;
      if (result) correlation.result = result;
    }
  }

  _bootstrapConnectors() {
    const factories = {
      http: HttpConnector,
      mock: MockConnector,
    };
    if (!marketplaceConfigs.length) {
      this.logger.warn('No marketplace connectors configured; system will idle until configuration is provided.');
    }
    marketplaceConfigs.forEach((cfg) => {
      if (!cfg.enabled) {
        return;
      }
      const Factory = factories[cfg.adapter];
      if (!Factory) {
        this.logger.warn({ adapter: cfg.adapter }, 'No factory for adapter');
        return;
      }
      const connector = new Factory(cfg, this.logger);
      connector.on('heartbeat', (health) => {
        this.marketHealth[cfg.id] = { ...health, market: cfg.name };
        this.emit('market:health', this.getMarketHealth());
      });
      connector.on('quotes', (quotes) => {
        this.priceCache.ingest(quotes);
        this.emit('quotes', quotes);
      });
      this.connectors.push(connector);
    });
  }

  _evaluateOpportunities() {
    const opportunities = this.arbEngine.evaluate(this.booksSnapshot);
    const nextMap = new Map();
    opportunities.forEach((opp) => {
      const existing = this.opportunities.get(opp.id);
      if (existing) {
        opp.createdAt = existing.createdAt;
      }
      nextMap.set(opp.id, opp);
      this.store
        .recordOpportunity(opp)
        .catch((err) => this.logger.error({ err }, 'Failed to persist opportunity'));
    });
    this.opportunities = nextMap;
    this.emit('opportunities', this.getOpportunities());
  }

  getOpportunities() {
    return Array.from(this.opportunities.values()).map((opp) => ({
      ...opp,
      ageMs: Date.now() - opp.createdAt,
    }));
  }

  getMarketHealth() {
    return Object.entries(this.marketHealth).map(([id, health]) => ({ id, ...health }));
  }

  getOrderBooks() {
    return this.booksSnapshot;
  }

  getMetrics() {
    const health = this.getMarketHealth();
    const portfolioStats = this.riskEngine.getPortfolioStats();
    return {
      totalOpportunities: this.opportunities.size,
      marketsTracked: this.connectors.length,
      marketsHealthy: health.filter((entry) => entry.state === 'healthy').length,
      lastRefresh: Date.now(),
      portfolio: portfolioStats,
      activeRequests: this.requestCorrelations.size,
    };
  }

  async getRecentExecutions(limit = 20) {
    return this.store.getRecentExecutions(limit);
  }

  async executeOpportunity(id, quantity, userContext = {}) {
    const opportunity = this.opportunities.get(id);
    if (!opportunity) {
      throw new Error('Opportunity no longer available');
    }

    const requestId = this._generateRequestId();
    const correlation = this._trackRequest(requestId, {
      type: 'execution',
      opportunityId: id,
      requestedQuantity: quantity,
      user: userContext.user || 'anonymous',
      source: userContext.source || 'api',
    });

    try {
      const lockResult = await this.store.tryAcquireLock(
        id,
        requestId,
        config.executionLockTimeoutMs
      );

      if (!lockResult.acquired) {
        this._updateRequestStatus(requestId, 'rejected', { reason: lockResult.reason });
        throw new Error(`Opportunity is locked: ${lockResult.reason}`);
      }

      const versionInfo = await this.store.getOpportunityVersion(id);
      
      const execution = await this.executionEngine.execute(opportunity, quantity, {
        requestId,
        expectedVersion: versionInfo.version,
      });

      const portfolioCheck = this.riskEngine.checkPortfolioLimits(execution);
      if (!portfolioCheck.approved) {
        await this.store.releaseLock(id, requestId);
        this._updateRequestStatus(requestId, 'rejected', { reason: 'portfolio_limit', issues: portfolioCheck.issues });
        throw new Error(`Portfolio limit violation: ${portfolioCheck.issues.join(', ')}`);
      }

      execution.requestId = requestId;
      this.riskEngine.recordExecutionResult(execution);
      
      opportunity.status = 'executed';
      opportunity.lastExecution = execution.executedAt;
      opportunity.lockVersion = versionInfo.version + 1;
      
      await this.store.releaseLock(id, requestId);
      
      this._updateRequestStatus(requestId, 'completed', { executionId: execution.id });
      this.emit('execution', execution);
      return execution;
    } catch (err) {
      await this.store.releaseLock(id, requestId);
      this._updateRequestStatus(requestId, 'failed', { error: err.message });
      throw err;
    }
  }

  async stop() {
    this.connectors.forEach((connector) => connector.stop());
    this.requestCorrelations.clear();
  }

  getRequestCorrelations() {
    return Array.from(this.requestCorrelations.values());
  }

  getPortfolioStats() {
    return this.riskEngine.getPortfolioStats();
  }
}

module.exports = GiftCardOrchestrator;
