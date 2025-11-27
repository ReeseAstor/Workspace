const EventEmitter = require('events');

class PriceCache extends EventEmitter {
  constructor(maxQuoteAgeMs) {
    super();
    this.maxQuoteAgeMs = maxQuoteAgeMs;
    this.books = new Map();
  }

  _key(quote) {
    return `${quote.brand.toLowerCase()}::${quote.denomination}`;
  }

  ingest(quotes) {
    quotes.forEach((quote) => {
      const key = this._key(quote);
      if (!this.books.has(key)) {
        this.books.set(key, {
          brand: quote.brand,
          denomination: quote.denomination,
          sell: new Map(),
          buy: new Map(),
        });
      }
      const book = this.books.get(key);
      book[quote.side].set(quote.marketId, quote);
    });

    this.purgeStale();
    this.emit('updated', this.snapshot());
  }

  purgeStale() {
    const now = Date.now();
    for (const book of this.books.values()) {
      ['sell', 'buy'].forEach((side) => {
        for (const [marketId, quote] of book[side].entries()) {
          if (now - quote.receivedAt > this.maxQuoteAgeMs) {
            book[side].delete(marketId);
          }
        }
      });
    }
  }

  snapshot() {
    const result = [];
    for (const [key, book] of this.books.entries()) {
      const [brand, denom] = key.split('::');
      result.push({
        brand,
        denomination: Number(denom),
        sell: Array.from(book.sell.values()).sort((a, b) => a.price - b.price),
        buy: Array.from(book.buy.values()).sort((a, b) => b.price - a.price),
      });
    }
    return result;
  }
}

module.exports = PriceCache;
