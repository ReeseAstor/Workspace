const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

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
      created_at INTEGER,
      version INTEGER DEFAULT 0,
      lock_version INTEGER DEFAULT 0
    )`);

    await this._run(`CREATE TABLE IF NOT EXISTS executions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opportunity_id TEXT,
      request_id TEXT,
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

    await this._run(`CREATE TABLE IF NOT EXISTS execution_locks (
      opportunity_id TEXT PRIMARY KEY,
      locked_by TEXT NOT NULL,
      locked_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    )`);

    await this._run(`CREATE TABLE IF NOT EXISTS daily_portfolio_stats (
      date TEXT PRIMARY KEY,
      total_executions INTEGER DEFAULT 0,
      total_notional REAL DEFAULT 0,
      total_pnl REAL DEFAULT 0,
      last_updated INTEGER
    )`);

    await this._run(`CREATE TABLE IF NOT EXISTS brand_positions (
      brand TEXT PRIMARY KEY,
      total_units INTEGER DEFAULT 0,
      total_exposure REAL DEFAULT 0,
      last_updated INTEGER
    )`);
  }

  async recordOpportunity(opportunity) {
    await this._run(
      `INSERT OR REPLACE INTO opportunities (id, brand, denomination, buy_market, sell_market, gross_spread_bps, net_spread_bps, net_profit_per_unit, quantity, created_at, version, lock_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT version FROM opportunities WHERE id = ?), 0) + 1, COALESCE((SELECT lock_version FROM opportunities WHERE id = ?), 0))`,
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
        opportunity.id,
        opportunity.id,
      ]
    );
  }

  async tryAcquireLock(opportunityId, requestId, timeoutMs) {
    const now = Date.now();
    const expiresAt = now + timeoutMs;
    
    await this._run('BEGIN IMMEDIATE TRANSACTION');
    
    try {
      const existing = await this._get(
        'SELECT * FROM execution_locks WHERE opportunity_id = ?',
        [opportunityId]
      );
      
      if (existing) {
        if (existing.expires_at > now && existing.locked_by !== requestId) {
          await this._run('ROLLBACK');
          return { acquired: false, reason: 'locked_by_other', expiresAt: existing.expires_at };
        }
        
        if (existing.expires_at <= now || existing.locked_by === requestId) {
          await this._run(
            'UPDATE execution_locks SET locked_by = ?, locked_at = ?, expires_at = ? WHERE opportunity_id = ?',
            [requestId, now, expiresAt, opportunityId]
          );
          await this._run('COMMIT');
          return { acquired: true, expiresAt };
        }
      } else {
        await this._run(
          'INSERT INTO execution_locks (opportunity_id, locked_by, locked_at, expires_at) VALUES (?, ?, ?, ?)',
          [opportunityId, requestId, now, expiresAt]
        );
        await this._run('COMMIT');
        return { acquired: true, expiresAt };
      }
    } catch (err) {
      await this._run('ROLLBACK');
      throw err;
    }
  }

  async releaseLock(opportunityId, requestId) {
    await this._run(
      'DELETE FROM execution_locks WHERE opportunity_id = ? AND locked_by = ?',
      [opportunityId, requestId]
    );
  }

  async getOpportunityVersion(opportunityId) {
    const row = await this._get('SELECT version, lock_version FROM opportunities WHERE id = ?', [opportunityId]);
    return row || { version: 0, lock_version: 0 };
  }

  async checkAndUpdateWithOptimisticLock(opportunityId, expectedVersion, requestId) {
    const result = await this._run(
      'UPDATE opportunities SET lock_version = lock_version + 1 WHERE id = ? AND version = ?',
      [opportunityId, expectedVersion]
    );
    return result.changes > 0;
  }

  async recordExecution(execution) {
    await this._run(
      `INSERT INTO executions (opportunity_id, request_id, quantity, brand, denomination, buy_market, sell_market, net_profit_per_unit, net_profit_total, executed_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        execution.opportunityId,
        execution.requestId,
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
    
    await this._updateDailyStats(execution);
    await this._updateBrandPosition(execution);
  }

  async _updateDailyStats(execution) {
    const today = new Date().toISOString().split('T')[0];
    const now = Date.now();
    
    const existing = await this._get('SELECT * FROM daily_portfolio_stats WHERE date = ?', [today]);
    
    if (existing) {
      await this._run(
        'UPDATE daily_portfolio_stats SET total_executions = total_executions + 1, total_notional = total_notional + ?, total_pnl = total_pnl + ?, last_updated = ? WHERE date = ?',
        [execution.quantity * execution.netProfitPerUnit, execution.netProfitTotal, now, today]
      );
    } else {
      await this._run(
        'INSERT INTO daily_portfolio_stats (date, total_executions, total_notional, total_pnl, last_updated) VALUES (?, 1, ?, ?, ?)',
        [today, execution.quantity * execution.netProfitPerUnit, execution.netProfitTotal, now]
      );
    }
  }

  async _updateBrandPosition(execution) {
    const exposure = execution.quantity * execution.buyMarket;
    
    const existing = await this._get('SELECT * FROM brand_positions WHERE brand = ?', [execution.brand]);
    
    if (existing) {
      await this._run(
        'UPDATE brand_positions SET total_units = total_units + ?, total_exposure = total_exposure + ?, last_updated = ? WHERE brand = ?',
        [execution.quantity, exposure, Date.now(), execution.brand]
      );
    } else {
      await this._run(
        'INSERT INTO brand_positions (brand, total_units, total_exposure, last_updated) VALUES (?, ?, ?, ?)',
        [execution.brand, execution.quantity, exposure, Date.now()]
      );
    }
  }

  async getDailyPortfolioStats() {
    const today = new Date().toISOString().split('T')[0];
    const row = await this._get('SELECT * FROM daily_portfolio_stats WHERE date = ?', [today]);
    return row || { date: today, total_executions: 0, total_notional: 0, total_pnl: 0, last_updated: 0 };
  }

  async getBrandPositions() {
    return this._all('SELECT * FROM brand_positions ORDER BY total_exposure DESC');
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

  _get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
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
