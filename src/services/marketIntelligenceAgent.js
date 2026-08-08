/**
 * Market Intelligence Agent for 88Away LLC
 * Specialized in KDP Niche Research and Affiliate Trend Analysis
 * Uses Qwen-Max for reasoning and Qwen-VL-Max for visual competitor analysis
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class MarketIntelligenceAgent {
  constructor(config) {
    this.config = config;
    this.dashScopeApiKey = process.env.DASHSCOPE_API_KEY;
    this.baseUrl = 'https://dashscope.aliyuncs.com/api/v1';
    
    // Target niches configuration
    this.targetNiches = [
      'mental health journals',
      'AI productivity planners', 
      'sustainability workbooks',
      'remote work guides',
      'low-content books',
      'medium-content activity books'
    ];
    
    this.competitorTools = ['Publisher Rocket', 'Helium 10', 'Jungle Scout'];
  }

  /**
   * Analyze niche profitability using AI reasoning
   * @param {string} niche - The niche to analyze
   * @returns {Promise<Object>} - Profitability score and insights
   */
  async analyzeNicheProfitability(niche) {
    const prompt = `
      As a KDP market expert, analyze the niche: "${niche}"
      
      Provide:
      1. Profitability Score (1-10)
      2. Competition Level (Low/Medium/High)
      3. Search Volume Trend (Rising/Stable/Declining)
      4. Top 5 Keywords with estimated monthly searches
      5. Recommended price point
      6. Potential risks
      
      Format as JSON.
    `;

    try {
      const response = await this.callQwenMax(prompt);
      return {
        niche,
        analysis: response,
        timestamp: new Date().toISOString(),
        requestId: uuidv4()
      };
    } catch (error) {
      console.error(`Error analyzing niche ${niche}:`, error.message);
      throw error;
    }
  }

  /**
   * Visual analysis of competitor book covers
   * @param {string} imageUrl - URL of competitor book cover
   * @param {string} niche - Target niche for context
   * @returns {Promise<Object>} - Visual analysis and design recommendations
   */
  async analyzeCompetitorCover(imageUrl, niche) {
    const prompt = `
      Analyze this book cover for the niche: "${niche}"
      
      Evaluate:
      1. Design quality and professionalism
      2. Typography effectiveness
      3. Color scheme appropriateness
      4. Genre alignment
      5. Click-through potential
      6. Recommendations for improvement
      
      Format as JSON.
    `;

    try {
      const response = await this.callQwenVLMax(prompt, imageUrl);
      return {
        imageUrl,
        niche,
        analysis: response,
        timestamp: new Date().toISOString(),
        requestId: uuidv4()
      };
    } catch (error) {
      console.error(`Error analyzing cover image:`, error.message);
      throw error;
    }
  }

  /**
   * Generate keyword optimization strategy
   * @param {string} niche - Target niche
   * @param {Array} existingKeywords - Current keywords used
   * @returns {Promise<Object>} - Optimized keyword strategy
   */
  async generateKeywordStrategy(niche, existingKeywords = []) {
    const prompt = `
      For KDP book in niche: "${niche}"
      Existing keywords: ${existingKeywords.join(', ') || 'None'}
      
      Generate:
      1. 10 high-volume, low-competition long-tail keywords
      2. 5 backend search terms (max 50 bytes each)
      3. 3 category recommendations
      4. Keyword difficulty scores (1-10)
      5. Seasonal trend analysis
      
      Format as JSON.
    `;

    try {
      const response = await this.callQwenMax(prompt);
      return {
        niche,
        strategy: response,
        timestamp: new Date().toISOString(),
        requestId: uuidv4()
      };
    } catch (error) {
      console.error(`Error generating keyword strategy:`, error.message);
      throw error;
    }
  }

  /**
   * Trend detection across multiple data sources
   * @returns {Promise<Object>} - Emerging trends report
   */
  async detectEmergingTrends() {
    const prompt = `
      Analyze current trends in KDP publishing and affiliate marketing.
      Focus on: mental health, AI productivity, sustainability, remote work.
      
      Identify:
      1. Top 5 emerging sub-niches
      2. Rising keywords (last 30 days)
      3. Declining markets to avoid
      4. Seasonal opportunities (next 90 days)
      5. Cross-niche opportunities
      
      Format as JSON with confidence scores.
    `;

    try {
      const response = await this.callQwenMax(prompt);
      return {
        trends: response,
        timestamp: new Date().toISOString(),
        requestId: uuidv4()
      };
    } catch (error) {
      console.error(`Error detecting trends:`, error.message);
      throw error;
    }
  }

  /**
   * Competitor gap analysis
   * @param {string} niche - Target niche
   * @param {Array} competitors - List of competitor ASINs or titles
   * @returns {Promise<Object>} - Gap analysis and opportunities
   */
  async analyzeCompetitorGaps(niche, competitors = []) {
    const prompt = `
      Perform gap analysis for niche: "${niche}"
      Key competitors: ${competitors.join(', ') || 'Market leaders'}
      
      Identify:
      1. Underserved customer segments
      2. Missing content types
      3. Price gaps in the market
      4. Quality issues in competitor reviews
      5. Opportunities for differentiation
      6. Recommended unique selling propositions
      
      Format as JSON.
    `;

    try {
      const response = await this.callQwenMax(prompt);
      return {
        niche,
        gaps: response,
        timestamp: new Date().toISOString(),
        requestId: uuidv4()
      };
    } catch (error) {
      console.error(`Error analyzing competitor gaps:`, error.message);
      throw error;
    }
  }

  /**
   * Call Qwen-Max for text reasoning tasks
   */
  async callQwenMax(prompt) {
    const payload = {
      model: 'qwen-max',
      input: {
        messages: [
          {
            role: 'system',
            content: 'You are an expert KDP publishing and affiliate marketing analyst. Provide data-driven insights in JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      parameters: {
        result_format: 'message',
        temperature: 0.7,
        max_tokens: 2000
      }
    };

    const response = await axios.post(
      `${this.baseUrl}/services/aigc/text-generation/generation`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${this.dashScopeApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.output.choices[0].message.content;
    try {
      return JSON.parse(content);
    } catch {
      return { raw: content, parsed: false };
    }
  }

  /**
   * Call Qwen-VL-Max for visual analysis tasks
   */
  async callQwenVLMax(prompt, imageUrl) {
    const payload = {
      model: 'qwen-vl-max',
      input: {
        messages: [
          {
            role: 'user',
            content: [
              { image: imageUrl },
              { text: prompt }
            ]
          }
        ]
      },
      parameters: {
        result_format: 'message',
        temperature: 0.7,
        max_tokens: 2000
      }
    };

    const response = await axios.post(
      `${this.baseUrl}/services/aigc/multimodal-generation/generation`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${this.dashScopeApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.output.choices[0].message.content;
    try {
      return JSON.parse(content);
    } catch {
      return { raw: content, parsed: false };
    }
  }

  /**
   * Run comprehensive market analysis
   */
  async runFullMarketAnalysis() {
    console.log('🔍 Starting comprehensive market analysis...');
    
    const results = {
      nicheAnalyses: [],
      trendReport: null,
      keywordStrategies: [],
      timestamp: new Date().toISOString()
    };

    // Analyze all target niches
    for (const niche of this.targetNiches) {
      console.log(`Analyzing niche: ${niche}`);
      const analysis = await this.analyzeNicheProfitability(niche);
      results.nicheAnalyses.push(analysis);
      
      const keywordStrategy = await this.generateKeywordStrategy(niche);
      results.keywordStrategies.push(keywordStrategy);
    }

    // Detect emerging trends
    results.trendReport = await this.detectEmergingTrends();

    return results;
  }
}

module.exports = MarketIntelligenceAgent;
