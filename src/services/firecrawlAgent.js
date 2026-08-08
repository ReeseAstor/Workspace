/**
 * FireCrawl Agent - Advanced Web Scraping & Content Extraction
 * For 88Away LLC KDP & Affiliate Marketing Intelligence
 * 
 * Capabilities:
 * - Competitor website analysis
 * - Market trend extraction from blogs/news
 * - Review sentiment analysis from external sites
 * - Price monitoring across retailers
 * - Content gap analysis
 */

const FirecrawlApp = require('firecrawl').default;
const EventEmitter = require('events');
const logger = require('../../src/logger');

class FireCrawlAgent extends EventEmitter {
    constructor(config = {}) {
        super();
        this.apiKey = config.apiKey || process.env.FIRECRAWL_API_KEY;
        this.baseUrl = config.baseUrl || 'https://api.firecrawl.dev';
        this.client = null;
        this.rateLimitDelay = config.rateLimitDelay || 1000; // ms between requests
        this.lastRequestTime = 0;
        
        if (this.apiKey) {
            this.initialize();
        } else {
            logger.warn('FireCrawl API key not configured. Running in mock mode.');
        }
    }

    initialize() {
        try {
            this.client = new FirecrawlApp({ apiKey: this.apiKey });
            logger.info('FireCrawl agent initialized successfully');
            this.emit('initialized', { timestamp: new Date().toISOString() });
        } catch (error) {
            logger.error('Failed to initialize FireCrawl:', error.message);
            this.emit('error', { type: 'INITIALIZATION', message: error.message });
        }
    }

    async _rateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.rateLimitDelay) {
            await new Promise(resolve => 
                setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest)
            );
        }
        this.lastRequestTime = Date.now();
    }

    /**
     * Scrape a single URL with advanced options
     * @param {string} url - Target URL
     * @param {object} options - Scraping options
     * @returns {Promise<object>} Scraped content
     */
    async scrapeUrl(url, options = {}) {
        await this._rateLimit();
        
        const defaultOptions = {
            formats: ['markdown', 'html'],
            onlyMainContent: true,
            waitFor: 0,
            timeout: 30000,
            ...options
        };

        try {
            logger.info(`Scraping URL: ${url}`);
            
            if (!this.client) {
                // Mock mode for development
                return this._mockScrape(url, defaultOptions);
            }

            const result = await this.client.scrapeUrl(url, defaultOptions);
            
            if (result.success) {
                this.emit('scrape_complete', { 
                    url, 
                    timestamp: new Date().toISOString(),
                    contentLength: result.markdown?.length || 0 
                });
                return result;
            } else {
                throw new Error(result.error || 'Scraping failed');
            }
        } catch (error) {
            logger.error(`FireCrawl scrape failed for ${url}:`, error.message);
            this.emit('scrape_error', { url, error: error.message });
            throw error;
        }
    }

    /**
     * Crawl multiple pages from a starting URL
     * @param {string} url - Starting URL
     * @param {object} options - Crawl options
     * @returns {Promise<object>} Crawl results
     */
    async crawlUrl(url, options = {}) {
        await this._rateLimit();
        
        const defaultOptions = {
            scrapeOptions: {
                formats: ['markdown'],
                onlyMainContent: true
            },
            limit: 20,
            maxDepth: 3,
            allowExternalLinks: false,
            ignoreSitemap: false,
            ...options
        };

        try {
            logger.info(`Starting crawl from: ${url}`);
            
            if (!this.client) {
                return this._mockCrawl(url, defaultOptions);
            }

            const crawlResult = await this.client.crawlUrl(url, defaultOptions);
            
            if (crawlResult.success) {
                this.emit('crawl_complete', { 
                    url, 
                    pagesScraped: crawlResult.data?.length || 0,
                    timestamp: new Date().toISOString()
                });
                return crawlResult;
            } else {
                throw new Error(crawlResult.error || 'Crawling failed');
            }
        } catch (error) {
            logger.error(`FireCrawl crawl failed from ${url}:`, error.message);
            this.emit('crawl_error', { url, error: error.message });
            throw error;
        }
    }

    /**
     * Extract structured data from URLs using LLM
     * @param {string[]} urls - Target URLs
     * @param {string} prompt - Extraction prompt
     * @param {object} schema - JSON schema for structured output
     * @returns {Promise<object>} Extracted data
     */
    async extractData(urls, prompt, schema = {}) {
        await this._rateLimit();
        
        const options = {
            prompt,
            schema: schema || {
                type: 'object',
                properties: {
                    products: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' },
                                price: { type: 'number' },
                                rating: { type: 'number' },
                                reviews: { type: 'string' }
                            }
                        }
                    }
                }
            }
        };

        try {
            logger.info(`Extracting data from ${urls.length} URLs`);
            
            if (!this.client) {
                return this._mockExtract(urls, prompt, schema);
            }

            const result = await this.client.extract(urls, options);
            
            if (result.success) {
                this.emit('extraction_complete', { 
                    urlsCount: urls.length,
                    timestamp: new Date().toISOString()
                });
                return result;
            } else {
                throw new Error(result.error || 'Extraction failed');
            }
        } catch (error) {
            logger.error('FireCrawl extraction failed:', error.message);
            this.emit('extraction_error', { error: error.message });
            throw error;
        }
    }

    /**
     * Search and scrape relevant pages
     * @param {string} query - Search query
     * @param {object} options - Search options
     * @returns {Promise<object>} Search results
     */
    async searchAndScrape(query, options = {}) {
        await this._rateLimit();
        
        const defaultOptions = {
            limit: 10,
            lang: 'en',
            country: 'us',
            scrapeOptions: {
                formats: ['markdown'],
                onlyMainContent: true
            },
            ...options
        };

        try {
            logger.info(`Searching for: "${query}"`);
            
            if (!this.client) {
                return this._mockSearch(query, defaultOptions);
            }

            const result = await this.client.searchAndScrape(query, defaultOptions);
            
            if (result.success) {
                this.emit('search_complete', { 
                    query,
                    resultsCount: result.data?.length || 0,
                    timestamp: new Date().toISOString()
                });
                return result;
            } else {
                throw new Error(result.error || 'Search failed');
            }
        } catch (error) {
            logger.error(`FireCrawl search failed for "${query}":`, error.message);
            this.emit('search_error', { query, error: error.message });
            throw error;
        }
    }

    /**
     * Monitor competitor pricing and products
     * @param {string[]} competitorUrls - List of competitor URLs to monitor
     * @returns {Promise<object>} Competitor analysis
     */
    async analyzeCompetitors(competitorUrls) {
        logger.info(`Analyzing ${competitorUrls.length} competitors`);
        
        const results = [];
        for (const url of competitorUrls) {
            try {
                const scraped = await this.scrapeUrl(url, {
                    formats: ['markdown', 'html']
                });
                
                // Extract key metrics
                const analysis = this._extractCompetitorInsights(scraped.markdown, url);
                results.push(analysis);
                
            } catch (error) {
                logger.warn(`Failed to analyze competitor ${url}:`, error.message);
                results.push({ url, error: error.message });
            }
        }
        
        const summary = this._generateCompetitorSummary(results);
        this.emit('competitor_analysis_complete', { 
            competitorsAnalyzed: results.length,
            timestamp: new Date().toISOString()
        });
        
        return { results, summary };
    }

    /**
     * Track market trends from industry blogs
     * @param {string[]} blogUrls - Industry blog URLs
     * @param {string} topic - Topic to track
     * @returns {Promise<object>} Trend analysis
     */
    async trackTrends(blogUrls, topic) {
        logger.info(`Tracking trends for "${topic}" across ${blogUrls.length} sources`);
        
        const articles = [];
        for (const url of blogUrls) {
            try {
                const scraped = await this.scrapeUrl(url, {
                    formats: ['markdown']
                });
                
                // Filter content related to topic
                const relevantContent = this._filterByTopic(scraped.markdown, topic);
                if (relevantContent) {
                    articles.push({
                        url,
                        content: relevantContent,
                        timestamp: new Date().toISOString()
                    });
                }
            } catch (error) {
                logger.warn(`Failed to scrape ${url}:`, error.message);
            }
        }
        
        const trends = this._identifyTrends(articles, topic);
        this.emit('trend_tracking_complete', { 
            articlesAnalyzed: articles.length,
            trendsIdentified: trends.length,
            timestamp: new Date().toISOString()
        });
        
        return { articles, trends };
    }

    // Helper Methods
    
    _extractCompetitorInsights(content, url) {
        // Extract pricing, products, ratings, etc.
        const insights = {
            url,
            scrapedAt: new Date().toISOString(),
            wordCount: content?.length || 0,
            hasPricing: /(\$[0-9]+|price|cost)/i.test(content),
            hasProducts: /(product|item|book|title)/i.test(content),
            hasRatings: /(\d\.\d\s?stars?|rating|review)/i.test(content),
            keywords: this._extractKeywords(content),
            potentialPrices: content?.match(/\$[0-9]+\.?[0-9]*/g) || []
        };
        
        return insights;
    }

    _extractKeywords(content, limit = 10) {
        const words = content?.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 4) || [];
        
        const frequency = {};
        words.forEach(word => {
            frequency[word] = (frequency[word] || 0) + 1;
        });
        
        return Object.entries(frequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([word]) => word);
    }

    _filterByTopic(content, topic) {
        const topicRegex = new RegExp(topic, 'gi');
        if (topicRegex.test(content)) {
            return content;
        }
        return null;
    }

    _identifyTrends(articles, topic) {
        // Simple trend identification based on keyword frequency
        const allKeywords = articles.flatMap(a => this._extractKeywords(a.content));
        const frequency = {};
        allKeywords.forEach(k => {
            frequency[k] = (frequency[k] || 0) + 1;
        });
        
        return Object.entries(frequency)
            .filter(([, count]) => count >= 2)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([keyword, count]) => ({ keyword, count }));
    }

    _generateCompetitorSummary(results) {
        const validResults = results.filter(r => !r.error);
        return {
            totalCompetitors: results.length,
            successfulAnalyses: validResults.length,
            averageWordCount: validResults.reduce((sum, r) => sum + (r.wordCount || 0), 0) / (validResults.length || 1),
            commonKeywords: this._getCommonKeywords(validResults),
            priceRange: this._calculatePriceRange(validResults)
        };
    }

    _getCommonKeywords(results) {
        const allKeywords = results.flatMap(r => r.keywords || []);
        const frequency = {};
        allKeywords.forEach(k => {
            frequency[k] = (frequency[k] || 0) + 1;
        });
        
        return Object.entries(frequency)
            .filter(([, count]) => count >= 2)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([keyword]) => keyword);
    }

    _calculatePriceRange(results) {
        const allPrices = results.flatMap(r => r.potentialPrices || [])
            .map(p => parseFloat(p.replace('$', '')))
            .filter(p => !isNaN(p));
        
        if (allPrices.length === 0) return { min: 0, max: 0, avg: 0 };
        
        return {
            min: Math.min(...allPrices),
            max: Math.max(...allPrices),
            avg: allPrices.reduce((a, b) => a + b, 0) / allPrices.length
        };
    }

    // Mock methods for development without API key
    _mockScrape(url, options) {
        logger.debug(`[MOCK] Scraping ${url}`);
        return Promise.resolve({
            success: true,
            markdown: `# Mock Content for ${url}\n\nThis is simulated scraped content for development purposes.\n\n## Key Points:\n- Product A: $29.99\n- Product B: $49.99\n- Rating: 4.5 stars\n- Reviews: 1,234`,
            html: `<html><body><h1>Mock Content</h1></body></html>`,
            metadata: { title: 'Mock Page', description: 'Simulated content' }
        });
    }

    _mockCrawl(url, options) {
        logger.debug(`[MOCK] Crawling from ${url}`);
        const pages = Array.from({ length: options.limit || 5 }, (_, i) => ({
            url: `${url}/page${i}`,
            markdown: `# Mock Page ${i}\n\nContent for page ${i}`
        }));
        
        return Promise.resolve({
            success: true,
            data: pages
        });
    }

    _mockExtract(urls, prompt, schema) {
        logger.debug(`[MOCK] Extracting from ${urls.length} URLs`);
        return Promise.resolve({
            success: true,
            data: {
                products: [
                    { name: 'Mock Product 1', price: 29.99, rating: 4.5, reviews: 'Great product!' },
                    { name: 'Mock Product 2', price: 49.99, rating: 4.2, reviews: 'Good value' }
                ]
            }
        });
    }

    _mockSearch(query, options) {
        logger.debug(`[MOCK] Searching for "${query}"`);
        const results = Array.from({ length: options.limit || 5 }, (_, i) => ({
            url: `https://example.com/result${i}`,
            title: `Mock Result ${i} for ${query}`,
            markdown: `# Mock Result ${i}\n\nRelevant content about ${query}`
        }));
        
        return Promise.resolve({
            success: true,
            data: results
        });
    }

    /**
     * Get usage statistics
     * @returns {object} Usage stats
     */
    getUsageStats() {
        return {
            initialized: !!this.client,
            rateLimitDelay: this.rateLimitDelay,
            lastRequestTime: this.lastRequestTime,
            apiKeyConfigured: !!this.apiKey
        };
    }
}

module.exports = FireCrawlAgent;
