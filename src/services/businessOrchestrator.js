/**
 * Business Orchestrator for 88Away LLC
 * Coordinates KDP and Affiliate Marketing AI Agents with Qwen Multi-Modal AI
 */

const EventEmitter = require('events');
const defaultLogger = require('../logger');
const KDPAgent = require('./kdpAgent');
const AffiliateAgent = require('./affiliateAgent');
const QwenAIAgent = require('./qwenAIAgent');

class BusinessOrchestrator extends EventEmitter {
  constructor(config, loggerInstance = defaultLogger) {
    super();
    const baseLogger = loggerInstance || defaultLogger;
    this.config = config;
    this.logger = baseLogger.child({ module: 'business-orchestrator' });
    this.kdpAgent = new KDPAgent(config, baseLogger);
    this.affiliateAgent = new AffiliateAgent(config, baseLogger);
    
    // Initialize Qwen AI Agent with premium configuration
    this.qwenAI = new QwenAIAgent({
      model: 'qwen-max', // Default to Qwen-Max (premium)
      timeout: 120000
    });
    
    this.insightsCache = null;
    this.lastInsightTime = null;
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes
    this.alerts = [];
    this.isRunning = false;

    this._bindAgentEvents();
  }

  _bindAgentEvents() {
    this.kdpAgent.on('book:alert', ({ book, type, timestamp }) => {
      this._recordAlert({
        source: 'kdp',
        type,
        priority: 'high',
        message: `${book.title} changed significantly`,
        bookAsin: book.asin,
        timestamp,
      });
    });

    this.kdpAgent.on('sync:error', ({ error, timestamp }) => {
      this._recordAlert({
        source: 'kdp',
        type: 'sync_error',
        priority: 'high',
        message: error,
        timestamp,
      });
    });

    this.affiliateAgent.on('campaign:alert', ({ campaign, type, timestamp }) => {
      this._recordAlert({
        source: 'affiliate',
        type,
        priority: 'high',
        message: `${campaign.name} requires attention`,
        campaignId: campaign.id,
        timestamp,
      });
    });

    this.affiliateAgent.on('sync:error', ({ source, error, timestamp }) => {
      this._recordAlert({
        source: `affiliate:${source}`,
        type: 'sync_error',
        priority: 'high',
        message: error,
        timestamp,
      });
    });
  }

  _recordAlert(alert) {
    const normalizedAlert = {
      ...alert,
      timestamp: alert.timestamp || Date.now(),
    };
    this.alerts.unshift(normalizedAlert);
    this.alerts = this.alerts.slice(0, 100);
    this.emit('alert', normalizedAlert);
  }

  async start() {
    if (this.isRunning) return;

    await Promise.all([
      this.kdpAgent.start(),
      this.affiliateAgent.start(),
    ]);

    this.isRunning = true;
    this._refreshInsights();
    this.emit('orchestrator:started', {
      lastSync: this._getLastSync(),
    });
  }

  async stop() {
    if (!this.isRunning) return;

    await Promise.all([
      this.kdpAgent.stop(),
      this.affiliateAgent.stop(),
    ]);

    this.isRunning = false;
    this.emit('orchestrator:stopped', {
      lastSync: this._getLastSync(),
    });
  }

  _getLastSync() {
    return Math.max(this.kdpAgent.lastSync || 0, this.affiliateAgent.lastSync || 0) || null;
  }

  _refreshInsights() {
    const insights = this._generateBasicInsights(this.getUnifiedMetrics());
    this.emit('insights:updated', { insights });
    this.generateInsights()
      .then((freshInsights) => {
        this.emit('insights:updated', { insights: freshInsights });
      })
      .catch((error) => {
        this.logger.warn({ err: error }, 'Failed to refresh AI insights');
      });
    return insights;
  }

  _buildKDPMetrics() {
    const rawMetrics = this.kdpAgent.getMetrics();
    const books = this.kdpAgent.getBooks();
    const topPerformers = [...books]
      .sort((left, right) => (right.totalUnits || 0) - (left.totalUnits || 0))
      .slice(0, 5);

    return {
      metrics: rawMetrics,
      books: {
        totalBooks: rawMetrics.totalBooks,
        items: books,
      },
      revenue: {
        total: rawMetrics.totalRoyaltiesEarned,
        currentMonth: rawMetrics.currentMonthRoyalties,
      },
      performance: {
        averageRating: rawMetrics.averageRating,
        totalReviews: rawMetrics.totalReviews,
      },
      topPerformers,
      categories: [...new Set(books.map((book) => book.category).filter(Boolean))],
    };
  }

  _buildAffiliateMetrics() {
    const rawMetrics = this.affiliateAgent.getMetrics();
    const campaigns = this.affiliateAgent.getCampaigns();
    const networks = this.affiliateAgent.getNetworks();
    const topNetworks = [...networks]
      .sort((left, right) => (right.totalEarnings || 0) - (left.totalEarnings || 0))
      .slice(0, 5);

    return {
      metrics: rawMetrics,
      campaigns: {
        totalCampaigns: rawMetrics.totalCampaigns,
        activeCampaigns: rawMetrics.activeCampaigns,
        items: campaigns,
      },
      revenue: {
        total: rawMetrics.totalRevenue,
        commission: rawMetrics.totalCommission,
        pendingBalance: rawMetrics.pendingBalance,
      },
      performance: {
        totalClicks: rawMetrics.totalClicks,
        totalConversions: rawMetrics.totalConversions,
        conversionRate: rawMetrics.averageConversionRate,
        ctr: rawMetrics.averageCTR,
        roi: rawMetrics.averageROI,
      },
      networks: {
        totalNetworks: rawMetrics.totalNetworks,
        activeNetworks: networks.filter((network) => network.status === 'active').length,
        items: networks,
      },
      topNetworks,
    };
  }

  /**
   * Get unified metrics from both agents
   */
  getUnifiedMetrics() {
    const kdpMetrics = this._buildKDPMetrics();
    const affiliateMetrics = this._buildAffiliateMetrics();
    const totalRevenue = kdpMetrics.revenue.total + affiliateMetrics.revenue.total;
    const lastSync = this._getLastSync();

    return {
      timestamp: new Date().toISOString(),
      business: {
        name: '88Away LLC',
        isHealthy: this.isRunning && kdpMetrics.metrics.isHealthy && affiliateMetrics.metrics.isHealthy,
        lastSync,
        totalRevenue,
      },
      kdp: kdpMetrics,
      affiliate: affiliateMetrics,
      combined: {
        totalRevenue,
        totalItems: kdpMetrics.books.totalBooks + affiliateMetrics.campaigns.totalCampaigns,
        activeChannels: 1 + affiliateMetrics.networks.activeNetworks,
        lastSync,
      }
    };
  }

  /**
   * Generate AI-powered insights using Qwen
   */
  async generateInsights() {
    if (this.insightsCache && (Date.now() - this.lastInsightTime) < this.cacheDuration) {
      return this.insightsCache;
    }

    const metrics = this.getUnifiedMetrics();
    
    const prompt = `
Analyze the following business metrics for 88Away LLC and provide actionable insights:

KDP Publishing:
- Total Books: ${metrics.kdp.books.totalBooks}
- Total Revenue: $${metrics.kdp.revenue.total.toFixed(2)}
- Average Rating: ${metrics.kdp.performance.averageRating}/5
- Total Reviews: ${metrics.kdp.performance.totalReviews}
- Best Seller: ${metrics.kdp.topPerformers[0]?.title || 'N/A'}

Affiliate Marketing:
- Total Campaigns: ${metrics.affiliate.campaigns.totalCampaigns}
- Total Revenue: $${metrics.affiliate.revenue.total.toFixed(2)}
- Total Clicks: ${metrics.affiliate.performance.totalClicks}
- Conversion Rate: ${metrics.affiliate.performance.conversionRate}%
- Top Network: ${metrics.affiliate.topNetworks[0]?.name || 'N/A'}

Combined Business:
- Total Revenue: $${metrics.combined.totalRevenue.toFixed(2)}
- Total Items/Campaigns: ${metrics.combined.totalItems}

Provide:
1. Key strengths
2. Areas for improvement
3. Growth opportunities
4. Risk factors
5. Recommended actions (prioritized)
`;

    try {
      const aiResponse = await this.qwenAI.generateText(prompt, {
        maxTokens: 2048,
        enableThinking: true
      });

      this.insightsCache = {
        timestamp: new Date().toISOString(),
        metrics,
        aiAnalysis: aiResponse.data?.text || aiResponse.data?.choices?.[0]?.message?.content || 'Analysis unavailable',
        recommendations: this._extractRecommendations(aiResponse),
        priority: this._calculatePriority(metrics)
      };
      
      this.lastInsightTime = Date.now();
      return this.insightsCache;
    } catch (error) {
      console.error('[Orchestrator] Error generating AI insights:', error.message);
      return this._generateBasicInsights(metrics);
    }
  }

  getInsights() {
    return this.insightsCache || this._generateBasicInsights(this.getUnifiedMetrics());
  }

  getAlerts(limit = 10) {
    return this.alerts.slice(0, limit);
  }

  getKDPMetrics() {
    return this._buildKDPMetrics();
  }

  getAllBooks() {
    return this.kdpAgent.getBooks();
  }

  getBookByASIN(asin) {
    return this.kdpAgent.getBookByASIN(asin);
  }

  getAffiliateMetrics() {
    return this._buildAffiliateMetrics();
  }

  getAllCampaigns() {
    return this.affiliateAgent.getCampaigns();
  }

  getCampaignById(id) {
    return this.affiliateAgent.getCampaignById(id);
  }

  getAllNetworks() {
    return this.affiliateAgent.getNetworks();
  }

  getRevenueReport(period = 'month') {
    const metrics = this.getUnifiedMetrics();
    const forecast = this.affiliateAgent.getCommissionForecast();

    return {
      period,
      generatedAt: new Date().toISOString(),
      revenue: {
        total: metrics.combined.totalRevenue,
        kdp: metrics.kdp.revenue.total,
        affiliate: metrics.affiliate.revenue.total,
      },
      forecast,
      business: metrics.business,
    };
  }

  /**
   * Analyze book cover or marketing image using Qwen Vision
   */
  async analyzeImage(imagePath, analysisType = 'book_cover') {
    const prompts = {
      book_cover: 'Analyze this book cover for 88Away LLC KDP publishing. Evaluate: visual appeal, genre appropriateness, title readability, market competitiveness, and suggest improvements.',
      marketing_creative: 'Analyze this marketing creative for 88Away LLC affiliate campaigns. Evaluate: call-to-action clarity, visual hierarchy, brand consistency, conversion potential, and suggest optimizations.',
      chart_graph: 'Analyze this business chart/graph for 88Away LLC. Extract key trends, identify anomalies, highlight growth opportunities, and summarize findings.'
    };

    const prompt = prompts[analysisType] || prompts.book_cover;
    
    try {
      const result = await this.qwenAI.analyzeImage(imagePath, prompt);
      return { success: true, analysisType, ...result };
    } catch (error) {
      console.error('[Orchestrator] Error analyzing image:', error.message);
      throw error;
    }
  }

  /**
   * Generate marketing image using Qwen
   */
  async generateMarketingImage(description, options = {}) {
    const defaultOptions = { size: '1024x1024', style: 'professional marketing' };
    const mergedOptions = { ...defaultOptions, ...options };
    
    try {
      const result = await this.qwenAI.generateImage(description, mergedOptions);
      return { success: true, description, ...result };
    } catch (error) {
      console.error('[Orchestrator] Error generating image:', error.message);
      throw error;
    }
  }

  /**
   * Transcribe audio content
   */
  async transcribeAudio(audioPath, language = 'en') {
    try {
      const result = await this.qwenAI.transcribeAudio(audioPath, language);
      return { success: true, ...result };
    } catch (error) {
      console.error('[Orchestrator] Error transcribing audio:', error.message);
      throw error;
    }
  }

  /**
   * Analyze video content
   */
  async analyzeVideo(videoPath, analysisType = 'marketing') {
    const prompts = {
      marketing: 'Analyze this marketing video for 88Away LLC. Evaluate: messaging clarity, visual engagement, call-to-action effectiveness, brand alignment, and suggest improvements.',
      tutorial: 'Analyze this tutorial video. Evaluate: instructional clarity, pacing, visual aids, viewer engagement, and suggest enhancements.',
      testimonial: 'Analyze this testimonial video. Extract key quotes, sentiment, credibility indicators, and marketing potential.'
    };

    const prompt = prompts[analysisType] || prompts.marketing;
    
    try {
      const result = await this.qwenAI.analyzeVideo(videoPath, prompt);
      return { success: true, analysisType, ...result };
    } catch (error) {
      console.error('[Orchestrator] Error analyzing video:', error.message);
      throw error;
    }
  }

  /**
   * Generate background music for marketing content
   */
  async generateMusic(description, options = {}) {
    try {
      const result = await this.qwenAI.generateMusic(description, options);
      return { success: true, description, ...result };
    } catch (error) {
      console.error('[Orchestrator] Error generating music:', error.message);
      throw error;
    }
  }

  /**
   * Multi-modal analysis combining multiple inputs
   */
  async multimodalAnalysis(inputs, prompt) {
    try {
      const result = await this.qwenAI.multimodalAnalysis(inputs, prompt);
      return { success: true, ...result };
    } catch (error) {
      console.error('[Orchestrator] Error in multi-modal analysis:', error.message);
      throw error;
    }
  }

  /**
   * Get Qwen AI usage statistics
   */
  getAIUsageStats() {
    return this.qwenAI.getTokenStats();
  }

  /**
   * Generate executive summary with AI assistance
   */
  async generateExecutiveSummary(period = 'month') {
    const metrics = this.getUnifiedMetrics();
    
    const prompt = `
Generate an executive summary for 88Away LLC's ${period} performance:

Key Metrics:
- Total Revenue: $${metrics.combined.totalRevenue.toFixed(2)}
- KDP Revenue: $${metrics.kdp.revenue.total.toFixed(2)} (${metrics.kdp.books.totalBooks} books)
- Affiliate Revenue: $${metrics.affiliate.revenue.total.toFixed(2)} (${metrics.affiliate.campaigns.totalCampaigns} campaigns)

Performance Highlights:
- KDP Average Rating: ${metrics.kdp.performance.averageRating}/5
- Affiliate Conversion Rate: ${metrics.affiliate.performance.conversionRate}%
- Top KDP Book: ${metrics.kdp.topPerformers[0]?.title || 'N/A'}
- Top Affiliate Network: ${metrics.affiliate.topNetworks[0]?.name || 'N/A'}

Create a concise executive summary covering:
1. Overall performance assessment
2. Key achievements
3. Challenges faced
4. Strategic recommendations for next period
5. Resource allocation suggestions
`;

    try {
      const aiResponse = await this.qwenAI.generateText(prompt, {
        maxTokens: 1536,
        enableThinking: true
      });

      return {
        period,
        generatedAt: new Date().toISOString(),
        metrics,
        summary: aiResponse.data?.text || aiResponse.data?.choices?.[0]?.message?.content,
        aiPowered: true
      };
    } catch (error) {
      console.error('[Orchestrator] Error generating executive summary:', error.message);
      return {
        period,
        generatedAt: new Date().toISOString(),
        metrics,
        summary: 'Executive summary generation failed. Please try again.',
        error: error.message,
        aiPowered: false
      };
    }
  }

  /**
   * Trigger sync across all agents
   */
  async triggerManualSync(source = 'all') {
    this.logger.info({ source }, 'Triggering manual sync');

    const syncJobs = [];
    if (source === 'all' || source === 'kdp') {
      syncJobs.push(
        this.kdpAgent.syncData().then(() => ({
          source: 'kdp',
          success: true,
          lastSync: this.kdpAgent.lastSync,
        }))
      );
    }
    if (source === 'all' || source === 'affiliate') {
      syncJobs.push(
        this.affiliateAgent.syncData().then(() => ({
          source: 'affiliate',
          success: true,
          lastSync: this.affiliateAgent.lastSync,
        }))
      );
    }

    const results = await Promise.allSettled(syncJobs);
    this._refreshInsights();

    return results.map((result) => (
      result.status === 'fulfilled'
        ? result.value
        : { success: false, error: result.reason?.message || String(result.reason) }
    ));
  }

  /**
   * Get alerts from both agents
   */
  getRecentAlerts(limit = 10) {
    return this.getAlerts(limit);
  }

  _extractRecommendations(aiResponse) {
    const text = aiResponse.data?.text || aiResponse.data?.choices?.[0]?.message?.content || '';
    const lines = text.split('\n').filter(line => line.trim());
    
    return lines.map((line, index) => ({
      id: index + 1,
      text: line.replace(/^[\d\.\-\*]+\s*/, ''),
      category: this._categorizeRecommendation(line)
    }));
  }

  _categorizeRecommendation(text) {
    const lower = text.toLowerCase();
    if (lower.includes('revenue') || lower.includes('profit')) return 'revenue';
    if (lower.includes('marketing') || lower.includes('promotion')) return 'marketing';
    if (lower.includes('content') || lower.includes('book')) return 'content';
    if (lower.includes('risk') || lower.includes('warning')) return 'risk';
    return 'general';
  }

  _calculatePriority(metrics) {
    let score = 50;
    if (metrics.combined.totalRevenue > 10000) score += 20;
    else if (metrics.combined.totalRevenue < 1000) score -= 20;
    if (metrics.kdp.performance.averageRating >= 4.5) score += 15;
    else if (metrics.kdp.performance.averageRating < 3.5) score -= 15;
    if (metrics.affiliate.performance.conversionRate >= 5) score += 15;
    else if (metrics.affiliate.performance.conversionRate < 2) score -= 15;
    return Math.min(100, Math.max(0, score));
  }

  _generateBasicInsights(metrics) {
    return {
      timestamp: new Date().toISOString(),
      metrics,
      aiAnalysis: 'AI analysis temporarily unavailable. Basic insights provided.',
      recommendations: [
        `Monitor top-performing book: ${metrics.kdp.topPerformers[0]?.title || 'N/A'}`,
        `Optimize affiliate campaigns with conversion rate below 3%`,
        `Consider expanding KDP catalog based on ${metrics.kdp.categories[0] || 'top category'} success`,
        `Review underperforming affiliate networks`
      ],
      priority: this._calculatePriority(metrics)
    };
  }
}

module.exports = BusinessOrchestrator;
