const express = require('express');
const http = require('http');
const crypto = require('crypto');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

const config = require('./config/env');
const BusinessOrchestrator = require('./src/services/businessOrchestrator');
const logger = require('./src/logger');

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(bodyParser.json({ limit: '50mb' })); // Increased for file uploads

const UNPROTECTED_PATHS = new Set(['/health']);
const AUTH_WINDOW_MS = 60_000;
const AUTH_MAX_ATTEMPTS = 5;
const AUTH_MAX_CREDENTIAL_BYTES = 1024;
const AUTH_COMPARE_BUFFER_SIZE = AUTH_MAX_CREDENTIAL_BYTES + 4;

const parseBasicAuthHeader = (header) => {
  if (!header || !header.startsWith('Basic ')) return null;

  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const separatorIndex = decoded.indexOf(':');
    if (separatorIndex === -1) return null;

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch (_err) {
    return null;
  }
};

const timingSafeMatch = (expected, actual) => {
  if (typeof expected !== 'string' || typeof actual !== 'string') return false;

  const expectedValue = Buffer.from(expected, 'utf8');
  const actualValue = Buffer.from(actual, 'utf8');
  if (expectedValue.length > AUTH_MAX_CREDENTIAL_BYTES || actualValue.length > AUTH_MAX_CREDENTIAL_BYTES) {
    return false;
  }

  const expectedBuffer = Buffer.alloc(AUTH_COMPARE_BUFFER_SIZE);
  expectedBuffer.writeUInt32BE(expectedValue.length, 0);
  expectedValue.copy(expectedBuffer, 4);

  const actualBuffer = Buffer.alloc(AUTH_COMPARE_BUFFER_SIZE);
  actualBuffer.writeUInt32BE(actualValue.length, 0);
  actualValue.copy(actualBuffer, 4);

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
};

const isAuthorizedRequest = (req) => {
  const credentials = parseBasicAuthHeader(req.headers.authorization);
  const usernameMatches = timingSafeMatch(config.landingPageUsername, credentials?.username || '');
  const passwordMatches = timingSafeMatch(config.landingPagePassword, credentials?.password || '');
  return usernameMatches && passwordMatches;
};

if (config.landingPageUsername && config.landingPagePassword) {
  const authRateLimiter = rateLimit({
    windowMs: AUTH_WINDOW_MS,
    limit: AUTH_MAX_ATTEMPTS,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    skip: (req) => UNPROTECTED_PATHS.has(req.path) || isAuthorizedRequest(req),
    message: 'Too many authentication attempts',
  });

  app.use(authRateLimiter);
  app.use((req, res, next) => {
    if (UNPROTECTED_PATHS.has(req.path)) return next();

    const isAuthorized = isAuthorizedRequest(req);

    if (isAuthorized) return next();

    res.setHeader('WWW-Authenticate', 'Basic realm="Workspace", charset="UTF-8"');
    return res.status(401).send('Authentication required');
  });
}

app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const server = http.createServer(app);
const orchestrator = new BusinessOrchestrator(config, logger);

orchestrator.start().catch((err) => {
  logger.error({ err }, 'Failed to start business orchestrator');
  process.exit(1);
});

// SSE for real-time updates
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
  
  // Send initial state
  const metrics = orchestrator.getUnifiedMetrics();
  pushEvent(client, 'metrics', metrics);
  pushEvent(client, 'insights', orchestrator.getInsights());
  pushEvent(client, 'alerts', orchestrator.getAlerts(10));

  req.on('close', () => {
    sseClients.delete(client);
  });
});

const heartbeat = setInterval(() => {
  broadcast('heartbeat', { timestamp: Date.now() });
}, config.sseHeartbeatMs);
if (heartbeat.unref) heartbeat.unref();

// Event listeners for real-time updates
orchestrator.on('alert', (alert) => {
  broadcast('alert', alert);
});

orchestrator.on('insights:updated', (data) => {
  broadcast('insights', data.insights);
  broadcast('metrics', orchestrator.getUnifiedMetrics());
});

orchestrator.on('orchestrator:started', (data) => {
  broadcast('status', { status: 'running', ...data });
});

orchestrator.on('orchestrator:stopped', (data) => {
  broadcast('status', { status: 'stopped', ...data });
});

app.get('/health', (req, res) => {
  const metrics = orchestrator.getUnifiedMetrics();
  res.json({ 
    status: 'ok', 
    business: '88Away LLC',
    running: metrics.business.isHealthy,
    lastSync: metrics.business.lastSync,
  });
});

// Unified metrics endpoint
app.get('/api/metrics', (req, res) => {
  res.json(orchestrator.getUnifiedMetrics());
});

// KDP-specific endpoints
app.get('/api/kdp/metrics', (req, res) => {
  res.json(orchestrator.getKDPMetrics());
});

app.get('/api/kdp/books', (req, res) => {
  res.json(orchestrator.getAllBooks());
});

app.get('/api/kdp/books/:asin', (req, res) => {
  const book = orchestrator.getBookByASIN(req.params.asin);
  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }
  res.json(book);
});

// Affiliate-specific endpoints
app.get('/api/affiliate/metrics', (req, res) => {
  res.json(orchestrator.getAffiliateMetrics());
});

app.get('/api/affiliate/campaigns', (req, res) => {
  res.json(orchestrator.getAllCampaigns());
});

app.get('/api/affiliate/campaigns/:id', (req, res) => {
  const campaign = orchestrator.getCampaignById(req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  res.json(campaign);
});

app.get('/api/affiliate/networks', (req, res) => {
  res.json(orchestrator.getAllNetworks());
});

// Insights and alerts
app.get('/api/insights', (req, res) => {
  res.json(orchestrator.getInsights());
});

app.get('/api/alerts', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  res.json(orchestrator.getAlerts(limit));
});

// Revenue reports
app.get('/api/reports/revenue', (req, res) => {
  const period = req.query.period || 'month';
  res.json(orchestrator.getRevenueReport(period));
});

// Executive summary
app.get('/api/executive-summary', async (req, res, next) => {
  try {
    res.json(await orchestrator.generateExecutiveSummary());
  } catch (err) {
    err.statusCode = 500;
    next(err);
  }
});

// Manual sync trigger
app.post('/api/sync', async (req, res, next) => {
  try {
    const source = req.query.source || 'all';
    const results = await orchestrator.triggerManualSync(source);
    res.json({ success: true, results });
  } catch (err) {
    err.statusCode = 500;
    next(err);
  }
});

app.use((err, req, res, _next) => {
  logger.error({ err, path: req.path }, 'Request failed');
  res.status(err.statusCode || 500).json({ 
    error: err.message || 'Internal Server Error',
    business: '88Away LLC',
  });
});

const PORT = config.port;
server.listen(PORT, () => {
  logger.info({ port: PORT }, '88Away LLC AI Premium Agent Platform listening');
});

process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await orchestrator.stop();
  server.close(() => process.exit(0));
});
