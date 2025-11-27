const EventEmitter = require('events');

class MarketplaceConnector extends EventEmitter {
  constructor(config, logger) {
    super();
    this.config = config;
    this.logger = logger.child({ connector: config.id });
    this.interval = null;
    this.health = {
      state: config.enabled ? 'initializing' : 'disabled',
      lastError: null,
      lastSuccessAt: null,
      lastLatencyMs: null,
    };
  }

  async start() {
    if (!this.config.enabled) {
      this.logger.warn('Connector disabled via configuration');
      return;
    }
    await this._tick();
    this.interval = setInterval(() => {
      this._tick();
    }, this.config.pollingIntervalMs);
    if (this.interval.unref) {
      this.interval.unref();
    }
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async _tick() {
    const started = Date.now();
    try {
      const quotes = await this.fetchQuotes();
      if (Array.isArray(quotes) && quotes.length) {
        this.emit('quotes', quotes);
      }
      this.health = {
        state: 'healthy',
        lastError: null,
        lastSuccessAt: Date.now(),
        lastLatencyMs: Date.now() - started,
      };
      this.emit('heartbeat', this.health);
    } catch (error) {
      this.health = {
        state: 'degraded',
        lastError: error.message,
        lastSuccessAt: this.health.lastSuccessAt,
        lastLatencyMs: null,
      };
      this.logger.error({ err: error }, 'Failed to fetch quotes');
      this.emit('heartbeat', this.health);
    }
  }

  // To be implemented by subclasses
  // Should return an array of normalized quotes
  async fetchQuotes() {
    throw new Error('fetchQuotes must be implemented by subclasses');
  }
}

module.exports = MarketplaceConnector;
