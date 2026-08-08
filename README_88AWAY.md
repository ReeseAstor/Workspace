# 88Away LLC - AI Premium Agents Platform

## Overview

This platform powers **88Away LLC**'s digital business operations using autonomous AI agents that track and optimize:

1. **KDP (Kindle Direct Publishing)** - Book sales, royalties, rankings, and reviews
2. **Affiliate Marketing** - Campaign performance, commissions, and ROI across multiple networks

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Business Orchestrator                     │
│  (Coordinates KDP & Affiliate Agents, Unified Insights)      │
└─────────────────────────────────────────────────────────────┘
         │                              │
         ├──────────────┬───────────────┤
         │              │               │
┌────────▼────────┐ ┌──▼──────────────▼──┐
│   KDP Agent     │ │  Affiliate Agent   │
│                 │ │                    │
│ • Book Tracking │ │ • Campaign Mgmt    │
│ • Sales Sync    │ │ • Network Sync     │
│ • Royalty Calc  │ │ • Commission Track │
│ • Rank Monitor  │ │ • ROI Analysis     │
│ • Review Alerts │ │ • Fraud Detection  │
└─────────────────┘ └────────────────────┘
```

## Features

### KDP Agent
- **Real-time book tracking**: Monitor all your KDP titles
- **Sales analytics**: Track daily/weekly/monthly sales trends
- **Royalty calculations**: Automatic royalty computation by marketplace
- **Rank monitoring**: BSR (Best Sellers Rank) tracking with alerts
- **Review management**: New review notifications and rating alerts
- **Insights generation**: AI-powered recommendations for improvement

### Affiliate Agent
- **Multi-network support**: Amazon Associates, ShareASale, and direct programs
- **Campaign tracking**: Monitor clicks, conversions, and revenue per campaign
- **Commission analytics**: Real-time commission tracking and forecasting
- **ROI analysis**: Calculate return on investment for each campaign
- **Anomaly detection**: Identify unusual patterns (potential fraud or issues)
- **Payout tracking**: Monitor pending balances and payout schedules

### Business Orchestrator
- **Unified dashboard**: Single view of all business metrics
- **Cross-platform insights**: Correlate KDP and affiliate performance
- **Revenue reports**: Combined revenue from all sources
- **Executive summaries**: Automated business health reports
- **Growth recommendations**: AI-suggested opportunities for expansion
- **Alert system**: Real-time notifications for critical events

## API Endpoints

### Health & Status
- `GET /health` - System health check
- `GET /api/stream` - Server-Sent Events (SSE) for real-time updates

### Unified Metrics
- `GET /api/metrics` - Combined business metrics
- `GET /api/insights` - AI-generated insights
- `GET /api/alerts` - Recent alerts (limit via query param)
- `GET /api/executive-summary` - Executive business summary

### KDP Endpoints
- `GET /api/kdp/metrics` - KDP-specific metrics
- `GET /api/kdp/books` - All tracked books
- `GET /api/kdp/books/:asin` - Specific book details

### Affiliate Endpoints
- `GET /api/affiliate/metrics` - Affiliate metrics
- `GET /api/affiliate/campaigns` - All campaigns
- `GET /api/affiliate/campaigns/:id` - Specific campaign
- `GET /api/affiliate/networks` - All affiliate networks

### Reports
- `GET /api/reports/revenue?period=month|year` - Revenue report
- `POST /api/sync?source=all|kdp|affiliate` - Trigger manual sync

## Configuration

Environment variables (`.env`):

```bash
# Server
PORT=3000
LOG_LEVEL=info

# KDP Agent
KDP_SYNC_INTERVAL_MS=300000

# Affiliate Agent
AFFILIATE_SYNC_INTERVAL_MS=300000

# SSE
SSE_HEARTBEAT_MS=15000
```

## Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

```bash
npm install
```

### Running

```bash
# Development
npm start

# Production
NODE_ENV=production npm start
```

### Access the Dashboard

Open `http://localhost:3000` in your browser.

## Example Responses

### Unified Metrics
```json
{
  "business": {
    "name": "88Away LLC",
    "lastSync": 1701234567890,
    "isHealthy": true
  },
  "kdp": {
    "totalBooks": 2,
    "totalUnitsSold": 3403,
    "totalRoyaltiesEarned": 23777.88,
    "currentMonthRoyalties": 123.67,
    "averageRating": 4.7,
    "totalReviews": 361
  },
  "affiliate": {
    "totalCampaigns": 3,
    "totalClicks": 10987,
    "totalConversions": 866,
    "totalCommission": 13495.15,
    "pendingBalance": 1925.90,
    "averageROI": 776.52
  },
  "combined": {
    "totalRevenue": 37273.03,
    "monthlyRevenue": 2049.57,
    "totalAssets": 5,
    "averageRating": 4.7,
    "totalAudience": 14390
  }
}
```

### Insights
```json
[
  {
    "type": "top_performer",
    "message": "Best seller: \"AI Marketing Mastery\" with 2156 units sold",
    "priority": "high",
    "source": "kdp"
  },
  {
    "type": "top_roi",
    "message": "Best ROI: \"88Away Premium Services\" with 1169.0% ROI",
    "priority": "high",
    "source": "affiliate"
  },
  {
    "type": "cross_promotion",
    "message": "Create affiliate campaigns specifically promoting your KDP books",
    "priority": "high",
    "source": "orchestrator"
  }
]
```

## Integration Guide

### Adding Real KDP API Integration

Replace the mock `_fetchKDPData()` method in `src/services/kdpAgent.js`:

```javascript
async _fetchKDPData() {
  // Integrate with Amazon KDP Reporting API
  const response = await fetch('https://kdp.amazon.com/api/orders', {
    headers: {
      'Authorization': `Bearer ${process.env.KDP_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
}
```

### Adding Real Affiliate Network APIs

Replace the mock `_fetchCampaignsData()` method in `src/services/affiliateAgent.js`:

```javascript
async _fetchCampaignsData() {
  // Amazon Associates
  const amazonData = await this._fetchAmazonAssociates();
  
  // ShareASale
  const shareasaleData = await this._fetchShareASale();
  
  return [...amazonData, ...shareasaleData];
}
```

## Monitoring & Alerts

The platform provides real-time alerts for:

- **KDP**: New books, significant rank changes, new reviews, low ratings
- **Affiliate**: New campaigns, anomaly detection, sync errors
- **Business**: Revenue milestones, growth opportunities

Alerts are available via:
- SSE stream (`/api/stream`)
- REST API (`/api/alerts`)
- Email/webhook integration (configure in production)

## Security Considerations

For production deployment:

1. **API Keys**: Store all API keys in environment variables
2. **Rate Limiting**: Implement rate limiting for API endpoints
3. **Authentication**: Add authentication middleware for protected routes
4. **HTTPS**: Always use HTTPS in production
5. **CORS**: Configure CORS policies appropriately

## Support

For 88Away LLC internal use. Contact the development team for:
- Custom integrations
- Feature requests
- Bug reports
- Training and onboarding

---

**© 2024 88Away LLC. All rights reserved.**
