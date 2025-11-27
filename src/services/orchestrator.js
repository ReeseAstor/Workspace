const EventEmitter = require('events');
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
    return {
      totalOpportunities: this.opportunities.size,
      marketsTracked: this.connectors.length,
      marketsHealthy: health.filter((entry) => entry.state === 'healthy').length,
      lastRefresh: Date.now(),
    };
  }

  async getRecentExecutions(limit = 20) {
    return this.store.getRecentExecutions(limit);
  }

  async executeOpportunity(id, quantity) {
    const opportunity = this.opportunities.get(id);
    if (!opportunity) {
      throw new Error('Opportunity no longer available');
    }
    const execution = await this.executionEngine.execute(opportunity, quantity);
    opportunity.status = 'executed';
    opportunity.lastExecution = execution.executedAt;
    this.emit('execution', execution);
    return execution;
  }

  async stop() {
    this.connectors.forEach((connector) => connector.stop());
  }
}

module.exports = GiftCardOrchestrator;
