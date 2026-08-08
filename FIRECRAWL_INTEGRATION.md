# 88Away LLC - AI Premium Agents Platform with FireCrawl Intelligence

## 🚀 Enterprise-Grade KDP & Affiliate Marketing Automation

This platform combines **Qwen3.8-Max multi-modal AI** with **FireCrawl web intelligence** to provide comprehensive business automation for 88Away LLC's digital publishing and affiliate marketing operations.

---

## 🎯 Core Capabilities

### Qwen Multi-Modal AI (Premium)
- **Text Generation**: qwen-max (32K tokens, default)
- **Vision Analysis**: qwen-vl-max for book covers, charts, marketing creatives
- **Image Generation**: wanx-v1 for marketing visuals
- **Audio Transcription**: paraformer-realtime-v2 for podcasts/meetings
- **Video Analysis**: qwen-vl-max for marketing video evaluation
- **Music Generation**: External API integration ready

### FireCrawl Web Intelligence
- **Competitor Analysis**: Automated monitoring of competitor pricing, products, ratings
- **Market Trend Tracking**: Extract insights from industry blogs and news sites
- **Price Monitoring**: Track pricing across multiple retailers
- **Content Gap Analysis**: Identify opportunities in your niche
- **Structured Data Extraction**: LLM-powered data extraction from any website
- **Search & Scrape**: Find and analyze relevant market information

---

## 📦 Installation

```bash
# Install dependencies
npm install

# Install FireCrawl (already done)
npm install @mendable/firecrawl-js firecrawl
```

---

## ⚙️ Configuration (.env)

```bash
# Server Configuration
PORT=3000
LOG_LEVEL=info

# Qwen AI Configuration
QWEN_API_KEY=your_qwen_api_key_here
QWEN_MODEL=qwen-max
QWEN_TIMEOUT_MS=120000

# Token Budget Limits
QWEN_DAILY_BUDGET=50.00
QWEN_MONTHLY_BUDGET=1000.00

# FireCrawl Configuration
FIRECRAWL_API_KEY=your_firecrawl_api_key_here
FIRECRAWL_RATE_LIMIT_DELAY=1000

# Multi-Modal AI Settings
QWEN_VISION_MODEL=qwen-vl-max
QWEN_IMAGE_MODEL=wanx-v1
QWEN_AUDIO_MODEL=paraformer-realtime-v2
ENABLE_THINKING=true
ENABLE_VISUAL=true
ENABLE_AUDIO=true
ENABLE_VIDEO=true
ENABLE_MUSIC=true
```

---

## 🔌 API Endpoints

### Business Intelligence

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/metrics` | GET | Unified KDP + Affiliate metrics |
| `/api/insights` | GET | AI-generated business insights |
| `/api/executive-summary` | GET | Executive business summary |
| `/api/alerts` | GET | Recent alerts and notifications |
| `/api/reports/revenue` | GET | Revenue reports (month/year) |

### KDP Publishing

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/kdp/books` | GET | All tracked books |
| `/api/kdp/metrics` | GET | KDP-specific metrics |
| `/api/kdp/books/:asin` | GET | Single book details |

### Affiliate Marketing

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/affiliate/campaigns` | GET | All campaigns |
| `/api/affiliate/networks` | GET | Network status |
| `/api/affiliate/metrics` | GET | Affiliate metrics |

### Qwen AI Multi-Modal

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/generate-text` | POST | Generate text with Qwen-Max |
| `/api/ai/analyze-image` | POST | Analyze book covers, charts |
| `/api/ai/generate-image` | POST | Create marketing visuals |
| `/api/ai/transcribe-audio` | POST | Transcribe audio files |
| `/api/ai/analyze-video` | POST | Analyze marketing videos |
| `/api/ai/generate-music` | POST | Generate background music |
| `/api/ai/multimodal` | POST | Combined multi-modal analysis |
| `/api/ai/stats` | GET | Token usage statistics |

### FireCrawl Intelligence ⭐ NEW

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/firecrawl/analyze-competitors` | POST | Analyze competitor websites |
| `/api/firecrawl/track-trends` | POST | Track market trends from blogs |
| `/api/firecrawl/scrape-analyze` | POST | Scrape and AI-analyze URL |
| `/api/firecrawl/extract-data` | POST | Extract structured data |
| `/api/firecrawl/search` | GET | Search and scrape market info |
| `/api/ai/stats` | GET | Qwen + FireCrawl usage stats |

### Real-Time

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stream` | GET | Server-Sent Events stream |
| `/api/sync` | POST | Trigger manual data sync |

---

## 💡 Usage Examples

### Analyze Competitors

```bash
curl -X POST http://localhost:3000/api/firecrawl/analyze-competitors \
  -H "Content-Type: application/json" \
  -d '{
    "competitorUrls": [
      "https://amazon.com/dp/B08XYZ123",
      "https://amazon.com/dp/B09ABC456"
    ]
  }'
```

### Track Market Trends

```bash
curl -X POST http://localhost:3000/api/firecrawl/track-trends \
  -H "Content-Type: application/json" \
  -d '{
    "blogUrls": [
      "https://publishersweekly.com",
      "https://thewritepractice.com"
    ],
    "topic": "self-publishing trends"
  }'
```

### Scrape and AI-Analyze

```bash
curl -X POST http://localhost:3000/api/firecrawl/scrape-analyze \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example-competitor.com",
    "analysisType": "competitor_analysis"
  }'
```

### Extract Structured Data

```bash
curl -X POST http://localhost:3000/api/firecrawl/extract-data \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://amazon.com/bestsellers/books"],
    "prompt": "Extract top 10 books with title, author, price, rating, and review count",
    "schema": {
      "type": "object",
      "properties": {
        "books": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "title": {"type": "string"},
              "author": {"type": "string"},
              "price": {"type": "number"},
              "rating": {"type": "number"},
              "reviews": {"type": "string"}
            }
          }
        }
      }
    }
  }'
```

### Search Market Information

```bash
curl "http://localhost:3000/api/firecrawl/search?query=KDP%20publishing%20trends%202025&limit=10"
```

### Multi-Modal Book Cover Analysis

```bash
curl -X POST http://localhost:3000/api/ai/analyze-image \
  -H "Content-Type: application/json" \
  -d '{
    "imagePath": "/uploads/book-cover.jpg",
    "analysisType": "book_cover"
  }'
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  88Away LLC Platform                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────┐ │
│  │  KDP Agent   │    │Affiliate Agent│   │FireCrawl  │ │
│  │              │    │               │   │  Agent    │ │
│  └──────┬───────┘    └──────┬───────┘   └─────┬─────┘ │
│         │                   │                  │       │
│         └───────────────────┼──────────────────┘       │
│                             │                          │
│                  ┌──────────▼──────────┐               │
│                  │ Business Orchestrator│               │
│                  │   + Qwen AI Engine   │               │
│                  └──────────┬──────────┘               │
│                             │                          │
│         ┌───────────────────┼──────────────────┐       │
│         │                   │                  │       │
│  ┌──────▼───────┐  ┌───────▼───────┐  ┌──────▼──────┐ │
│  │ Qwen-Max     │  │ Qwen-VL-Max   │  │ Wanx-V1     │ │
│  │ (Text/Think) │  │ (Vision)      │  │ (Images)    │ │
│  └──────────────┘  └───────────────┘  └─────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Business Strategy Integration

### Future-Proof KDP Business Strategy

✅ **Market Positioning**: High-profit niches (low/medium content, AI guides)  
✅ **AI Content Pipeline**: 3-stage system (Research → Creation → QC)  
✅ **Marketing Automation**: Centralized hub with real-time dashboards  
✅ **Revenue Diversification**: 60% primary, 25% secondary, 15% tertiary  
✅ **Compliance**: Originality verification, metadata checking  

### Revenue Optimization

- **Dynamic Pricing**: AI-powered price adjustments
- **Amazon Ads**: ACOS optimization (<30%)
- **Cross-Promotion**: KDP books ↔ Affiliate campaigns
- **Forecasting**: Revenue predictions with confidence intervals

---

## 🔒 Security & Rate Limiting

- **Helmet.js**: HTTP security headers
- **CORS**: Configured for production
- **Rate Limiting**: FireCrawl requests throttled (1s delay default)
- **Token Budgets**: Daily/monthly/per-request limits
- **Mock Mode**: FireCrawl works without API key for development

---

## 🚀 Getting Started

```bash
# 1. Clone and install
git clone <repository>
cd 88away-ai-platform
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 3. Start server
npm start

# 4. Access dashboard
open http://localhost:3000
```

---

## 📈 Projected ROI Timeline

| Phase | Timeline | Revenue | Focus |
|-------|----------|---------|-------|
| Foundation | Months 1-2 | $0-500 | Setup, initial books |
| Traction | Months 3-4 | $500-2K | First sales, optimization |
| Scaling | Months 5-6 | $2K-5K | Expanded catalog, ads |
| Profit | Months 7-12 | $5K-20K+ | Multi-market, automation |

**Success Metrics:**
- 10-20 books published monthly
- 4.3+ average ratings
- <30% ad ACOS
- 60/40 organic-to-paid sales ratio

---

## 🛠️ Tech Stack

- **Backend**: Node.js/Express
- **Database**: SQLite (PostgreSQL ready)
- **AI Services**: Qwen (DashScope), FireCrawl
- **Frontend**: React dashboard (planned)
- **APIs**: Amazon SP-API, Email marketing, Advertising platforms

---

## 📝 License

Proprietary - 88Away LLC © 2025

---

## 🆘 Support

For issues or questions:
- Check logs in `/logs` directory
- Review API documentation above
- Contact: support@88away.com
