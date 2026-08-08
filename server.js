const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const bodyParser = require('body-parser');
const path = require('path');

const config = require('./config/env');
const BusinessOrchestrator = require('./src/services/businessOrchestrator');
const PremiumQwenAgent = require('./src/services/premiumQwenAgent');
const logger = require('./src/logger');

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(bodyParser.json({ limit: '50mb' })); // Increased for file uploads
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const server = http.createServer(app);

// Initialize FireCrawl config
const firecrawlConfig = {
  apiKey: process.env.FIRECRAWL_API_KEY,
  rateLimitDelay: 1000
};

const orchestrator = new BusinessOrchestrator(
  { kdpAgent: null, affiliateAgent: null }, // Will be initialized properly
  firecrawlConfig
);
const qwenAgent = new PremiumQwenAgent({ apiKey: process.env.QWEN_API_KEY });

// Initialize both services
Promise.all([
  orchestrator.start(),
  Promise.resolve(qwenAgent) // Qwen agent is ready immediately
]).catch((err) => {
  logger.error({ err }, 'Failed to start services');
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

// Qwen Agent event forwarding
qwenAgent.on('request_completed', (data) => {
  broadcast('ai_request_completed', data);
});

qwenAgent.on('request_failed', (data) => {
  broadcast('ai_request_failed', data);
});

qwenAgent.on('budget_warning', (data) => {
  broadcast('budget_warning', data);
  logger.warn({ budget: data }, 'AI Budget warning');
});

app.get('/health', (req, res) => {
  const metrics = orchestrator.getUnifiedMetrics();
  res.json({ 
    status: 'ok', 
    business: '88Away LLC',
    platform: 'AI Premium Agents',
    running: metrics.business.isHealthy,
    lastSync: metrics.business.lastSync,
    ai_ready: true,
    qwen_model: qwenAgent.defaultModel
  });
});

// ============================================
// PREMIUM QWEN AI ENDPOINTS
// ============================================

// Get AI usage statistics and token plan info
app.get('/api/ai/stats', (req, res) => {
  res.json(qwenAgent.getTokenStats());
});

// Text generation with thinking capability
app.post('/api/ai/generate-text', async (req, res, next) => {
  try {
    const { prompt, options = {} } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    const result = await qwenAgent.generateText(prompt, options);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Image analysis (vision capability)
app.post('/api/ai/analyze-image', async (req, res, next) => {
  try {
    const { imagePath, prompt, options = {} } = req.body;
    if (!imagePath) {
      return res.status(400).json({ error: 'Image path is required' });
    }
    const result = await qwenAgent.analyzeImage(imagePath, options);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Image generation for marketing materials
app.post('/api/ai/generate-image', async (req, res, next) => {
  try {
    const { prompt, options = {} } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    const result = await qwenAgent.generateImage(prompt, options);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Audio transcription
app.post('/api/ai/transcribe-audio', async (req, res, next) => {
  try {
    const { audioPath, options = {} } = req.body;
    if (!audioPath) {
      return res.status(400).json({ error: 'Audio path is required' });
    }
    const result = await qwenAgent.transcribeAudio(audioPath, options);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Video analysis
app.post('/api/ai/analyze-video', async (req, res, next) => {
  try {
    const { videoPath, options = {} } = req.body;
    if (!videoPath) {
      return res.status(400).json({ error: 'Video path is required' });
    }
    const result = await qwenAgent.analyzeVideo(videoPath, options);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Music generation request
app.post('/api/ai/generate-music', async (req, res, next) => {
  try {
    const { prompt, options = {} } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    const result = await qwenAgent.generateMusic(prompt, options);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Multi-modal analysis
app.post('/api/ai/multimodal', async (req, res, next) => {
  try {
    const { inputs, prompt, options = {} } = req.body;
    if (!inputs || !prompt) {
      return res.status(400).json({ error: 'Inputs and prompt are required' });
    }
    const result = await qwenAgent.multimodalAnalysis(inputs, prompt, options);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Business analysis specialized for KDP/Affiliate
app.post('/api/ai/business-analysis', async (req, res, next) => {
  try {
    const { data, analysisType, options = {} } = req.body;
    if (!data || !analysisType) {
      return res.status(400).json({ error: 'Data and analysisType are required' });
    }
    const result = await qwenAgent.businessAnalysis(data, analysisType, options);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Set active model
app.post('/api/ai/set-model', (req, res) => {
  const { model } = req.body;
  try {
    const result = qwenAgent.setModel(model);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Clear AI cache
app.post('/api/ai/clear-cache', (req, res) => {
  const result = qwenAgent.clearCache();
  res.json(result);
});

// ============================================
// BUSINESS ORCHESTRATOR ENDPOINTS (existing)
// ============================================

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
app.get('/api/executive-summary', async (req, res) => {
  try {
    const summary = await orchestrator.generateExecutiveSummary(req.query.period || 'month');
    res.json({ success: true, summary });
  } catch (err) {
    err.statusCode = 500;
    next(err);
  }
});

// FireCrawl Intelligence Endpoints

// Analyze competitors
app.post('/api/firecrawl/analyze-competitors', async (req, res, next) => {
  try {
    const { competitorUrls } = req.body;
    if (!competitorUrls || !Array.isArray(competitorUrls)) {
      return res.status(400).json({ error: 'competitorUrls array required' });
    }
    const result = await orchestrator.analyzeCompetitors(competitorUrls);
    res.json(result);
  } catch (err) {
    err.statusCode = 500;
    next(err);
  }
});

// Track market trends
app.post('/api/firecrawl/track-trends', async (req, res, next) => {
  try {
    const { blogUrls, topic } = req.body;
    if (!blogUrls || !Array.isArray(blogUrls) || !topic) {
      return res.status(400).json({ error: 'blogUrls array and topic required' });
    }
    const result = await orchestrator.trackMarketTrends(blogUrls, topic);
    res.json(result);
  } catch (err) {
    err.statusCode = 500;
    next(err);
  }
});

// Scrape and analyze single URL
app.post('/api/firecrawl/scrape-analyze', async (req, res, next) => {
  try {
    const { url, analysisType } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'url required' });
    }
    const result = await orchestrator.scrapeAndAnalyze(url, analysisType || 'general');
    res.json(result);
  } catch (err) {
    err.statusCode = 500;
    next(err);
  }
});

// Extract structured market data
app.post('/api/firecrawl/extract-data', async (req, res, next) => {
  try {
    const { urls, prompt, schema } = req.body;
    if (!urls || !Array.isArray(urls) || !prompt) {
      return res.status(400).json({ error: 'urls array and prompt required' });
    }
    const result = await orchestrator.extractMarketData(urls, prompt, schema);
    res.json(result);
  } catch (err) {
    err.statusCode = 500;
    next(err);
  }
});

// Search and scrape market information
app.get('/api/firecrawl/search', async (req, res, next) => {
  try {
    const { query, limit } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'query parameter required' });
    }
    const options = limit ? { limit: parseInt(limit) } : {};
    const result = await orchestrator.searchMarketInfo(query, options);
    res.json(result);
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
