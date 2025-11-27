const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const bodyParser = require('body-parser');

const config = require('./config/env');
const GiftCardOrchestrator = require('./src/services/orchestrator');
const logger = require('./src/logger');

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(bodyParser.json({ limit: '1mb' }));
app.use(express.static('public'));

const server = http.createServer(app);
const orchestrator = new GiftCardOrchestrator();

orchestrator.start().catch((err) => {
  logger.error({ err }, 'Failed to start orchestrator');
  process.exit(1);
});

const sseClients = new Set();

const pushEvent = (client, event, payload) => {
  client.res.write(`event: ${event}\n`);
  client.res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const broadcast = (event, payload) => {
  sseClients.forEach((client) => {
    pushEvent(client, event, payload);
  });
};

app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const client = { res };
  sseClients.add(client);
  pushEvent(client, 'opportunities', orchestrator.getOpportunities());
  pushEvent(client, 'marketHealth', orchestrator.getMarketHealth());
  pushEvent(client, 'metrics', orchestrator.getMetrics());

  req.on('close', () => {
    sseClients.delete(client);
  });
});

const heartbeat = setInterval(() => {
  broadcast('heartbeat', { timestamp: Date.now() });
}, config.sseHeartbeatMs);
if (heartbeat.unref) heartbeat.unref();

orchestrator.on('opportunities', (data) => {
  broadcast('opportunities', data);
  broadcast('metrics', orchestrator.getMetrics());
});
orchestrator.on('market:health', (data) => {
  broadcast('marketHealth', data);
  broadcast('metrics', orchestrator.getMetrics());
});
orchestrator.on('execution', (data) => {
  broadcast('execution', data);
  broadcast('metrics', orchestrator.getMetrics());
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', metrics: orchestrator.getMetrics() });
});

app.get('/api/markets', (req, res) => {
  res.json(orchestrator.getMarketHealth());
});

app.get('/api/books', (req, res) => {
  res.json(orchestrator.getOrderBooks());
});

app.get('/api/opportunities', (req, res) => {
  res.json(orchestrator.getOpportunities());
});

app.get('/api/metrics', (req, res) => {
  res.json(orchestrator.getMetrics());
});

app.get('/api/executions', async (req, res, next) => {
  try {
    const executions = await orchestrator.getRecentExecutions();
    res.json(executions);
  } catch (err) {
    next(err);
  }
});

app.post('/api/opportunities/:id/execute', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body || {};
    const result = await orchestrator.executeOpportunity(id, quantity);
    res.json({ success: true, execution: result });
  } catch (err) {
    err.statusCode = 400;
    next(err);
  }
});

app.use((err, req, res, _next) => {
  logger.error({ err, path: req.path }, 'Request failed');
  res.status(err.statusCode || 500).json({ error: err.message || 'Internal Server Error', details: err.issues });
});

const PORT = config.port;
server.listen(PORT, () => {
  logger.info({ port: PORT }, 'Gift card arbitrage platform listening');
});

process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await orchestrator.stop();
  server.close(() => process.exit(0));
});
