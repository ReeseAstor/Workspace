const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class SqliteStore {
  constructor(dbPath, logger) {
    this.dbPath = path.resolve(dbPath);
    this.logger = logger.child({ module: 'sqlite-store' });
    this.db = new sqlite3.Database(this.dbPath, (err) => {
      if (err) {
        this.logger.error({ err }, 'Failed to open SQLite database');
      } else {
        this.logger.info({ dbPath: this.dbPath }, 'SQLite database ready');
      }
    });
  }

  async initialize() {
    await this._run(`CREATE TABLE IF NOT EXISTS opportunities (
      id TEXT PRIMARY KEY,
      brand TEXT NOT NULL,
      denomination INTEGER NOT NULL,
      buy_market TEXT NOT NULL,
      sell_market TEXT NOT NULL,
      gross_spread_bps REAL,
      net_spread_bps REAL,
      net_profit_per_unit REAL,
      quantity INTEGER,
      created_at INTEGER
    )`);

    await this._run(`CREATE TABLE IF NOT EXISTS executions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opportunity_id TEXT,
      quantity INTEGER,
      brand TEXT,
      denomination INTEGER,
      buy_market TEXT,
      sell_market TEXT,
      net_profit_per_unit REAL,
      net_profit_total REAL,
      executed_at INTEGER,
      status TEXT
    )`);
  }

  async recordOpportunity(opportunity) {
    await this._run(
      `INSERT OR REPLACE INTO opportunities (id, brand, denomination, buy_market, sell_market, gross_spread_bps, net_spread_bps, net_profit_per_unit, quantity, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        opportunity.id,
        opportunity.brand,
        opportunity.denomination,
        opportunity.buyLeg.marketName,
        opportunity.sellLeg.marketName,
        opportunity.metrics.grossSpreadBps,
        opportunity.metrics.netSpreadBps,
        opportunity.metrics.netProfitPerUnit,
        opportunity.quantity,
        opportunity.createdAt,
      ]
    );
  }

  async recordExecution(execution) {
    await this._run(
      `INSERT INTO executions (opportunity_id, quantity, brand, denomination, buy_market, sell_market, net_profit_per_unit, net_profit_total, executed_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        execution.opportunityId,
        execution.quantity,
        execution.brand,
        execution.denomination,
        execution.buyMarket,
        execution.sellMarket,
        execution.netProfitPerUnit,
        execution.netProfitTotal,
        execution.executedAt,
        execution.status,
      ]
    );
  }

  async getRecentExecutions(limit = 20) {
    return this._all(`SELECT * FROM executions ORDER BY executed_at DESC LIMIT ?`, [limit]);
  }

  _run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve(this);
      });
    });
  }

  _all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }
}

module.exports = SqliteStore;
