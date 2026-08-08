# Business Logic Enhancements

This document describes the business logic enhancements implemented to improve the arbitrage system's reliability, risk management, and traceability.

## 1. Optimistic Locking for Concurrent Execution Prevention

### Problem
Multiple execution requests for the same opportunity could lead to race conditions, double-spending, and inconsistent state.

### Solution
Implemented optimistic locking with database-backed version tracking:

- **Version Tracking**: Each opportunity has a `version` field that increments on every update
- **Lock Acquisition**: Before execution, a lock is acquired with a timeout (`execution_locks` table)
- **Version Validation**: During execution, the system validates that the opportunity version hasn't changed
- **Lock Release**: Locks are released after execution completes or on failure

### Configuration
```env
EXECUTION_LOCK_TIMEOUT_MS=5000  # Lock timeout in milliseconds
```

### API Changes
Execution requests now include automatic lock handling:
- If locked by another request: Returns error with reason
- If version mismatch: Returns optimistic lock failure error
- On success: Updates opportunity version

## 2. Portfolio-Level Position Limits and Risk Controls

### Problem
Lack of portfolio-wide risk controls could lead to excessive exposure, concentration risk, and unbounded losses.

### Solution
Implemented comprehensive portfolio-level risk management in `RiskEngine`:

#### Daily Limits
- **Max Daily Executions**: Limit number of trades per day
- **Max Daily Notional**: Cap total notional value traded daily
- **Max Daily Loss**: Stop trading after reaching loss threshold
- **Cooldown Period**: Pause trading after a loss

#### Position Limits
- **Per-Brand Position Limit**: Maximum units held per brand
- **Total Exposure Limit**: Maximum total portfolio exposure

### Configuration
```env
# Daily limits
MAX_DAILY_EXECUTIONS=100
MAX_DAILY_NOTIONAL=50000
MAX_LOSS_PER_DAY=5000
COOLDOWN_AFTER_LOSS_MS=300000  # 5 minutes

# Position limits
MAX_POSITION_PER_BRAND=500
MAX_TOTAL_EXPOSURE=100000
```

### New Methods
- `riskEngine.checkPortfolioLimits(execution)`: Validates against all limits
- `riskEngine.recordExecutionResult(execution)`: Updates portfolio stats
- `riskEngine.getPortfolioStats()`: Returns current portfolio state

### API Endpoints
- `GET /api/portfolio/stats`: Current portfolio statistics
- `GET /api/metrics`: Now includes portfolio stats

## 3. Request Correlation Tracking

### Problem
Difficulty tracing requests across system components for debugging and audit purposes.

### Solution
Implemented end-to-end request correlation:

- **Request ID Generation**: Unique UUID for each execution request
- **Context Propagation**: Request ID flows through all components
- **Status Tracking**: Track request lifecycle (pending → completed/failed/rejected)
- **Duration Metrics**: Measure request processing time
- **User Context**: Capture user and source information

### Implementation
```javascript
// In orchestrator.js
_generateRequestId() // Creates UUID
_trackRequest(requestId, context) // Records request start
_updateRequestStatus(requestId, status, result) // Updates status
```

### Database Schema
Executions table now includes:
- `request_id`: Unique correlation identifier

### API Changes
- Execute endpoint accepts headers:
  - `X-User-Id`: User identifier
  - `X-Request-Source`: Request source system
- Response includes `requestId` for correlation

### API Endpoints
- `GET /api/requests/correlations`: Active request correlations

## Database Schema Changes

### New Tables

#### execution_locks
```sql
CREATE TABLE execution_locks (
  opportunity_id TEXT PRIMARY KEY,
  locked_by TEXT NOT NULL,
  locked_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
```

#### daily_portfolio_stats
```sql
CREATE TABLE daily_portfolio_stats (
  date TEXT PRIMARY KEY,
  total_executions INTEGER DEFAULT 0,
  total_notional REAL DEFAULT 0,
  total_pnl REAL DEFAULT 0,
  last_updated INTEGER
);
```

#### brand_positions
```sql
CREATE TABLE brand_positions (
  brand TEXT PRIMARY KEY,
  total_units INTEGER DEFAULT 0,
  total_exposure REAL DEFAULT 0,
  last_updated INTEGER
);
```

### Modified Tables

#### opportunities
Added columns:
- `version INTEGER DEFAULT 0`
- `lock_version INTEGER DEFAULT 0`

#### executions
Added column:
- `request_id TEXT`

## Usage Example

```bash
# Execute with user context
curl -X POST http://localhost:3000/api/opportunities/amazon-100-marketA-marketB/execute \
  -H "Content-Type: application/json" \
  -H "X-User-Id: trader123" \
  -H "X-Request-Source: web-ui" \
  -d '{"quantity": 5}'

# Get portfolio stats
curl http://localhost:3000/api/portfolio/stats

# Get active request correlations
curl http://localhost:3000/api/requests/correlations
```

## Error Handling

### Optimistic Lock Failure
```json
{
  "error": "Opportunity is locked: locked_by_other",
  "details": ["locked_by_other"]
}
```

### Portfolio Limit Violation
```json
{
  "error": "Portfolio limit violation: daily_execution_limit_reached",
  "details": ["daily_execution_limit_reached"]
}
```

### Version Mismatch
```json
{
  "error": "Optimistic lock failure: opportunity version changed from 5 to 6",
  "details": []
}
```

## Benefits

1. **Concurrency Safety**: Prevents race conditions during execution
2. **Risk Management**: Comprehensive portfolio-level controls
3. **Audit Trail**: Full request traceability
4. **Debugging**: Easy to track issues across components
5. **Compliance**: Meets regulatory requirements for trade tracking
