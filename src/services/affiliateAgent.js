const EventEmitter = require('events');
const crypto = require('crypto');
const logger = require('../logger');

/**
 * AI Agent for tracking Affiliate Marketing campaigns
 * Monitors clicks, conversions, commissions, and ROI across multiple networks
 */
class AffiliateAgent extends EventEmitter {
  constructor(config, loggerInstance) {
    super();
    this.config = config;
    this.logger = loggerInstance.child({ module: 'affiliate-agent' });
    this.campaigns = new Map();
    this.networks = new Map();
    this.conversions = [];
    this.dailyStats = {};
    this.lastSync = null;
    this.isRunning = false;
    this.syncInterval = null;
  }

  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.logger.info('Affiliate Agent starting...');
    
    // Initial sync
    await this._syncCampaigns();
    await this._syncNetworks();
    
    // Set up periodic sync
    const syncIntervalMs = this.config.affiliateSyncIntervalMs || 300000; // 5 minutes default
    this.syncInterval = setInterval(() => this._syncAll(), syncIntervalMs);
    
    this.logger.info({ syncIntervalMs }, 'Affiliate Agent started');
  }

  async stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    this.logger.info('Affiliate Agent stopped');
  }

  async _syncAll() {
    await Promise.all([
      this._syncCampaigns(),
      this._syncNetworks(),
    ]);
  }

  async _syncCampaigns() {
    try {
      this.logger.debug('Syncing affiliate campaigns...');
      
      const campaignsData = await this._fetchCampaignsData();
      
      campaignsData.forEach((campaignData) => {
        const existingCampaign = this.campaigns.get(campaignData.id);
        
        if (existingCampaign) {
          // Update existing campaign
          campaignData.firstTracked = existingCampaign.firstTracked;
          campaignData.history = [...(existingCampaign.history || []), ...campaignData.recentActivity];
          
          // Detect anomalies
          if (this._detectAnomaly(existingCampaign, campaignData)) {
            this.emit('campaign:alert', {
              type: 'anomaly_detected',
              campaign: campaignData,
              timestamp: Date.now(),
            });
          }
        } else {
          // New campaign discovered
          campaignData.firstTracked = Date.now();
          campaignData.history = campaignData.recentActivity || [];
          this.emit('campaign:new', { campaign: campaignData, timestamp: Date.now() });
        }
        
        this.campaigns.set(campaignData.id, campaignData);
      });
      
      this.lastSync = Date.now();
      this.logger.info({ campaignsCount: this.campaigns.size }, 'Campaign sync complete');
    } catch (err) {
      this.logger.error({ err }, 'Failed to sync campaigns');
      this.emit('sync:error', { source: 'campaigns', error: err.message, timestamp: Date.now() });
    }
  }

  async _syncNetworks() {
    try {
      this.logger.debug('Syncing affiliate networks...');
      
      const networksData = await this._fetchNetworksData();
      
      networksData.forEach((networkData) => {
        const existingNetwork = this.networks.get(networkData.id);
        
        if (existingNetwork) {
          networkData.firstTracked = existingNetwork.firstTracked;
        } else {
          networkData.firstTracked = Date.now();
          this.emit('network:new', { network: networkData, timestamp: Date.now() });
        }
        
        this.networks.set(networkData.id, networkData);
      });
      
      this.logger.info({ networksCount: this.networks.size }, 'Network sync complete');
    } catch (err) {
      this.logger.error({ err }, 'Failed to sync networks');
      this.emit('sync:error', { source: 'networks', error: err.message, timestamp: Date.now() });
    }
  }

  async _fetchCampaignsData() {
    // Mock data - in production, integrate with actual affiliate networks (Amazon Associates, ShareASale, etc.)
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockCampaigns = [
          {
            id: 'camp_001',
            name: 'AI Books Promotion',
            networkId: 'amazon_associates',
            status: 'active',
            type: 'content',
            targetUrl: 'https://88away.com/ai-books',
            startDate: '2024-01-01',
            endDate: null,
            budget: 500,
            currency: 'USD',
            metrics: {
              impressions: 45230,
              clicks: 3421,
              conversions: 287,
              revenue: 4532.89,
              commission: 317.30,
              ctr: 7.56,
              conversionRate: 8.39,
              epc: 0.93,
              roi: 534.6,
            },
            recentActivity: [
              { date: new Date().toISOString(), clicks: 45, conversions: 4, revenue: 63.20 },
            ],
            topProducts: [
              { asin: 'B08EXAMPLE1', title: 'AI Marketing Mastery', sales: 127, commission: 89.45 },
              { asin: 'B08EXAMPLE2', title: 'Affiliate Marketing Automation', sales: 98, commission: 73.21 },
            ],
            tags: ['books', 'ai', 'marketing', 'education'],
          },
          {
            id: 'camp_002',
            name: 'SaaS Tools Review',
            networkId: 'shareasale',
            status: 'active',
            type: 'review',
            targetUrl: 'https://88away.com/saas-tools',
            startDate: '2024-02-15',
            endDate: null,
            budget: 300,
            currency: 'USD',
            metrics: {
              impressions: 28450,
              clicks: 2134,
              conversions: 156,
              revenue: 3245.67,
              commission: 487.85,
              ctr: 7.50,
              conversionRate: 7.31,
              epc: 2.29,
              roi: 625.95,
            },
            recentActivity: [
              { date: new Date().toISOString(), clicks: 32, conversions: 2, revenue: 45.80 },
            ],
            topProducts: [
              { productId: 'saas_001', title: 'Email Marketing Pro', sales: 45, commission: 225.00 },
              { productId: 'saas_002', title: 'SEO Analytics Tool', sales: 34, commission: 136.00 },
            ],
            tags: ['saas', 'tools', 'software', 'b2b'],
          },
          {
            id: 'camp_003',
            name: '88Away Premium Services',
            networkId: 'internal',
            status: 'active',
            type: 'direct',
            targetUrl: 'https://88away.com/premium',
            startDate: '2024-03-01',
            endDate: null,
            budget: 1000,
            currency: 'USD',
            metrics: {
              impressions: 67890,
              clicks: 5432,
              conversions: 423,
              revenue: 12690.00,
              commission: 12690.00,
              ctr: 8.00,
              conversionRate: 7.79,
              epc: 2.34,
              roi: 1169.0,
            },
            recentActivity: [
              { date: new Date().toISOString(), clicks: 78, conversions: 6, revenue: 180.00 },
            ],
            topProducts: [
              { productId: 'svc_001', title: 'Premium Consulting', sales: 23, commission: 2300.00 },
              { productId: 'svc_002', title: 'AI Implementation', sales: 15, commission: 3000.00 },
            ],
            tags: ['services', 'consulting', 'premium', '88away'],
          },
        ];
        resolve(mockCampaigns);
      }, 500);
    });
  }

  async _fetchNetworksData() {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockNetworks = [
          {
            id: 'amazon_associates',
            name: 'Amazon Associates',
            status: 'active',
            apiConnected: true,
            lastPayout: '2024-11-15',
            nextPayout: '2024-12-15',
            pendingBalance: 456.78,
            totalEarnings: 15234.56,
            paymentMethod: 'direct_deposit',
            threshold: 100,
            currency: 'USD',
          },
          {
            id: 'shareasale',
            name: 'ShareASale',
            status: 'active',
            apiConnected: true,
            lastPayout: '2024-11-01',
            nextPayout: '2024-12-01',
            pendingBalance: 234.56,
            totalEarnings: 8765.43,
            paymentMethod: 'check',
            threshold: 50,
            currency: 'USD',
          },
          {
            id: 'internal',
            name: '88Away Direct',
            status: 'active',
            apiConnected: true,
            lastPayout: '2024-11-30',
            nextPayout: '2024-12-31',
            pendingBalance: 1234.56,
            totalEarnings: 45678.90,
            paymentMethod: 'wire',
            threshold: 500,
            currency: 'USD',
          },
        ];
        resolve(mockNetworks);
      }, 500);
    });
  }

  _detectAnomaly(oldCampaign, newCampaign) {
    const oldMetrics = oldCampaign.metrics;
    const newMetrics = newCampaign.metrics;
    
    // Check for significant CTR drop (>30%)
    const ctrDrop = ((oldMetrics.ctr - newMetrics.ctr) / oldMetrics.ctr) * 100;
    if (ctrDrop > 30) return true;
    
    // Check for conversion rate spike (potential fraud)
    const convSpike = ((newMetrics.conversionRate - oldMetrics.conversionRate) / oldMetrics.conversionRate) * 100;
    if (convSpike > 100) return true;
    
    // Check for unusual EPC change
    const epcChange = Math.abs(((newMetrics.epc - oldMetrics.epc) / oldMetrics.epc) * 100);
    if (epcChange > 50) return true;
    
    return false;
  }

  getCampaigns() {
    return Array.from(this.campaigns.values()).map((campaign) => ({
      ...campaign,
      daysActive: Math.floor((Date.now() - campaign.firstTracked) / (1000 * 60 * 60 * 24)),
    }));
  }

  getCampaignById(id) {
    return this.campaigns.get(id);
  }

  getNetworks() {
    return Array.from(this.networks.values());
  }

  getNetworkById(id) {
    return this.networks.get(id);
  }

  getMetrics() {
    const campaigns = this.getCampaigns();
    const networks = this.getNetworks();
    
    const totalImpressions = campaigns.reduce((sum, c) => sum + (c.metrics?.impressions || 0), 0);
    const totalClicks = campaigns.reduce((sum, c) => sum + (c.metrics?.clicks || 0), 0);
    const totalConversions = campaigns.reduce((sum, c) => sum + (c.metrics?.conversions || 0), 0);
    const totalRevenue = campaigns.reduce((sum, c) => sum + (c.metrics?.revenue || 0), 0);
    const totalCommission = campaigns.reduce((sum, c) => sum + (c.metrics?.commission || 0), 0);
    const avgCTR = campaigns.length > 0 
      ? campaigns.reduce((sum, c) => sum + (c.metrics?.ctr || 0), 0) / campaigns.length 
      : 0;
    const avgConversionRate = campaigns.length > 0 
      ? campaigns.reduce((sum, c) => sum + (c.metrics?.conversionRate || 0), 0) / campaigns.length 
      : 0;
    const avgROI = campaigns.length > 0 
      ? campaigns.reduce((sum, c) => sum + (c.metrics?.roi || 0), 0) / campaigns.length 
      : 0;
    
    const pendingBalance = networks.reduce((sum, n) => sum + (n.pendingBalance || 0), 0);
    const totalEarnings = networks.reduce((sum, n) => sum + (n.totalEarnings || 0), 0);
    
    return {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter(c => c.status === 'active').length,
      totalNetworks: networks.length,
      totalImpressions,
      totalClicks,
      totalConversions,
      totalRevenue,
      totalCommission,
      averageCTR: parseFloat(avgCTR.toFixed(2)),
      averageConversionRate: parseFloat(avgConversionRate.toFixed(2)),
      averageROI: parseFloat(avgROI.toFixed(2)),
      pendingBalance,
      totalLifetimeEarnings: totalEarnings,
      lastSync: this.lastSync,
      isHealthy: this.isRunning && this.lastSync !== null,
    };
  }

  generateInsights() {
    const campaigns = this.getCampaigns();
    const insights = [];
    
    // Top performing campaign by ROI
    const topROI = campaigns.reduce((max, c) => 
      (c.metrics?.roi || 0) > (max?.metrics?.roi || 0) ? c : max, null);
    
    if (topROI) {
      insights.push({
        type: 'top_roi',
        message: `Best ROI: "${topROI.name}" with ${(topROI.metrics?.roi || 0).toFixed(1)}% ROI`,
        priority: 'high',
        campaignId: topROI.id,
      });
    }
    
    // Campaigns with low CTR
    campaigns.forEach((campaign) => {
      if (campaign.metrics?.ctr < 3 && campaign.metrics?.impressions > 1000) {
        insights.push({
          type: 'low_ctr',
          message: `"${campaign.name}" has a low CTR of ${(campaign.metrics.ctr || 0).toFixed(2)}%. Consider optimizing creative.`,
          priority: 'medium',
          campaignId: campaign.id,
        });
      }
    });
    
    // High-converting campaigns
    campaigns.forEach((campaign) => {
      if (campaign.metrics?.conversionRate > 10) {
        insights.push({
          type: 'high_conversion',
          message: `"${campaign.name}" is converting at ${(campaign.metrics.conversionRate || 0).toFixed(2)}%. Consider increasing budget.`,
          priority: 'positive',
          campaignId: campaign.id,
        });
      }
    });
    
    // Pending payouts reminder
    const networks = this.getNetworks();
    networks.forEach((network) => {
      if (network.pendingBalance > network.threshold) {
        insights.push({
          type: 'payout_ready',
          message: `${network.name} has $${network.pendingBalance.toFixed(2)} ready for payout (threshold: $${network.threshold})`,
          priority: 'info',
          networkId: network.id,
        });
      }
    });
    
    return insights;
  }

  getCommissionForecast(days = 30) {
    const campaigns = this.getCampaigns();
    const dailyCommission = campaigns.reduce((sum, c) => {
      const history = c.history || [];
      if (history.length === 0) return sum;
      
      const totalComm = history.reduce((s, h) => s + (h.revenue || 0), 0);
      return sum + (totalComm / history.length);
    }, 0);
    
    return {
      dailyAverage: dailyCommission,
      forecast30Days: dailyCommission * days,
      confidence: 'medium',
      basedOnCampaigns: campaigns.length,
    };
  }
}

module.exports = AffiliateAgent;
