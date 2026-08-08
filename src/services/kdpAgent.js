const EventEmitter = require('events');
const crypto = require('crypto');
const logger = require('../logger');

/**
 * AI Agent for tracking KDP (Kindle Direct Publishing) books
 * Monitors sales, royalties, rankings, and reviews
 */
class KDPAgent extends EventEmitter {
  constructor(config, loggerInstance) {
    super();
    this.config = config;
    this.logger = loggerInstance.child({ module: 'kdp-agent' });
    this.books = new Map();
    this.salesHistory = [];
    this.royaltyData = { currentMonth: 0, previousMonth: 0 };
    this.lastSync = null;
    this.isRunning = false;
    this.syncInterval = null;
  }

  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.logger.info('KDP Agent starting...');
    
    // Initial sync
    await this._syncBooks();
    
    // Set up periodic sync
    const syncIntervalMs = this.config.kdpSyncIntervalMs || 300000; // 5 minutes default
    this.syncInterval = setInterval(() => this._syncBooks(), syncIntervalMs);
    
    this.logger.info({ syncIntervalMs }, 'KDP Agent started');
  }

  async stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    this.logger.info('KDP Agent stopped');
  }

  async syncData() {
    await this._syncBooks();
  }

  async _syncBooks() {
    try {
      this.logger.debug('Syncing KDP books...');
      
      // Simulate fetching data from KDP API
      // In production, this would integrate with Amazon KDP API
      const booksData = await this._fetchKDPData();
      
      booksData.forEach((bookData) => {
        const existingBook = this.books.get(bookData.asin);
        
        if (existingBook) {
          // Update existing book
          bookData.firstTracked = existingBook.firstTracked;
          bookData.salesHistory = [...existingBook.salesHistory, ...bookData.recentSales];
          
          // Detect significant changes
          if (this._detectSignificantChange(existingBook, bookData)) {
            this.emit('book:alert', {
              type: 'significant_change',
              book: bookData,
              timestamp: Date.now(),
            });
          }
        } else {
          // New book discovered
          bookData.firstTracked = Date.now();
          bookData.salesHistory = bookData.recentSales || [];
          this.emit('book:new', { book: bookData, timestamp: Date.now() });
        }
        
        this.books.set(bookData.asin, bookData);
      });
      
      // Calculate royalties
      this._calculateRoyalties(booksData);
      
      this.lastSync = Date.now();
      this.emit('sync:complete', { 
        booksCount: this.books.size, 
        timestamp: this.lastSync,
        syncDuration: Date.now() - this.lastSync 
      });
      
      this.logger.info({ booksCount: this.books.size }, 'KDP sync complete');
    } catch (err) {
      this.logger.error({ err }, 'Failed to sync KDP data');
      this.emit('sync:error', { error: err.message, timestamp: Date.now() });
    }
  }

  async _fetchKDPData() {
    // Mock data - in production, integrate with actual KDP API
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockBooks = [
          {
            asin: 'B08EXAMPLE1',
            title: 'AI Marketing Mastery',
            author: '88Away Team',
            category: 'Business & Money',
            price: 9.99,
            currency: 'USD',
            kdpSelect: true,
            pages: 245,
            publishDate: '2024-01-15',
            currentRank: {
              overall: 15234,
              category: 45,
              subcategory: 12,
            },
            recentSales: [{ date: new Date().toISOString(), units: 5, kes: 34.55 }],
            totalUnits: 1247,
            totalRoyalties: 8543.21,
            reviews: { count: 127, averageRating: 4.6 },
            keywords: ['AI', 'marketing', 'automation', 'business'],
            status: 'active',
          },
          {
            asin: 'B08EXAMPLE2',
            title: 'Affiliate Marketing Automation',
            author: '88Away Team',
            category: 'Computers & Technology',
            price: 14.99,
            currency: 'USD',
            kdpSelect: false,
            pages: 312,
            publishDate: '2024-02-20',
            currentRank: {
              overall: 8932,
              category: 23,
              subcategory: 7,
            },
            recentSales: [{ date: new Date().toISOString(), units: 8, kes: 89.12 }],
            totalUnits: 2156,
            totalRoyalties: 15234.67,
            reviews: { count: 234, averageRating: 4.8 },
            keywords: ['affiliate', 'marketing', 'passive income', 'automation'],
            status: 'active',
          },
        ];
        resolve(mockBooks);
      }, 500);
    });
  }

  _detectSignificantChange(oldBook, newBook) {
    const rankChangePercent = Math.abs(
      (newBook.currentRank.overall - oldBook.currentRank.overall) / oldBook.currentRank.overall
    ) * 100;
    
    const reviewChange = newBook.reviews.count - oldBook.reviews.count;
    
    // Alert on significant rank change (>20%) or new reviews
    return rankChangePercent > 20 || reviewChange > 0;
  }

  _calculateRoyalties(booksData) {
    let monthlyRoyalty = 0;
    booksData.forEach((book) => {
      const recentSales = book.recentSales || [];
      recentSales.forEach((sale) => {
        const saleDate = new Date(sale.date);
        const now = new Date();
        
        // Count sales from current month
        if (saleDate.getMonth() === now.getMonth() && 
            saleDate.getFullYear() === now.getFullYear()) {
          monthlyRoyalty += sale.kes || 0;
        }
      });
    });
    
    this.royaltyData.currentMonth = monthlyRoyalty;
  }

  getBooks() {
    return Array.from(this.books.values()).map((book) => ({
      ...book,
      daysTracked: Math.floor((Date.now() - book.firstTracked) / (1000 * 60 * 60 * 24)),
    }));
  }

  getBookByASIN(asin) {
    return this.books.get(asin);
  }

  getRoyaltyData() {
    return { ...this.royaltyData, lastSync: this.lastSync };
  }

  getMetrics() {
    const books = this.getBooks();
    const totalUnits = books.reduce((sum, book) => sum + (book.totalUnits || 0), 0);
    const totalRoyalties = books.reduce((sum, book) => sum + (book.totalRoyalties || 0), 0);
    const avgRating = books.length > 0 
      ? books.reduce((sum, book) => sum + (book.reviews?.averageRating || 0), 0) / books.length 
      : 0;
    const totalReviews = books.reduce((sum, book) => sum + (book.reviews?.count || 0), 0);
    
    return {
      totalBooks: books.length,
      totalUnitsSold: totalUnits,
      totalRoyaltiesEarned: totalRoyalties,
      currentMonthRoyalties: this.royaltyData.currentMonth,
      averageRating: parseFloat(avgRating.toFixed(2)),
      totalReviews,
      lastSync: this.lastSync,
      isHealthy: this.isRunning && this.lastSync !== null,
    };
  }

  generateInsights() {
    const books = this.getBooks();
    const insights = [];
    
    // Top performer
    const topBook = books.reduce((max, book) => 
      (book.totalUnits || 0) > (max?.totalUnits || 0) ? book : max, null);
    
    if (topBook) {
      insights.push({
        type: 'top_performer',
        message: `Best seller: "${topBook.title}" with ${topBook.totalUnits} units sold`,
        priority: 'high',
        bookAsin: topBook.asin,
      });
    }
    
    // Books needing attention (low ratings)
    books.forEach((book) => {
      if (book.reviews?.averageRating < 4.0 && book.reviews?.count > 10) {
        insights.push({
          type: 'rating_alert',
          message: `"${book.title}" has a rating of ${book.reviews.averageRating}. Consider reviewing feedback.`,
          priority: 'medium',
          bookAsin: book.asin,
        });
      }
    });
    
    // Rank improvements
    books.forEach((book) => {
      if (book.salesHistory?.length >= 2) {
        const prevRank = book.salesHistory[book.salesHistory.length - 2]?.rank || Infinity;
        const currentRank = book.currentRank?.overall || Infinity;
        
        if (currentRank < prevRank * 0.8) { // 20% improvement
          insights.push({
            type: 'rank_improvement',
            message: `"${book.title}" rank improved significantly (#${currentRank})`,
            priority: 'positive',
            bookAsin: book.asin,
          });
        }
      }
    });
    
    return insights;
  }
}

module.exports = KDPAgent;
