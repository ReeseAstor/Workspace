const pino = require('pino');
const config = require('../config/env');

const logger = pino({
  level: config.logLevel,
  transport: config.logPretty
    ? {
        target: 'pino-pretty',
        options: { colorize: true, singleLine: true },
      }
    : undefined,
  base: { service: 'gift-card-arbitrage' },
});

module.exports = logger;
