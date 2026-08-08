# 88Away LLC - AI Agent Configuration Guide

## Qwen3.8-Max Multi-Modal AI Setup

### Environment Variables Required

Add these to your `.env` file:

```bash
# Alibaba Cloud DashScope API Configuration
DASHSCOPE_API_KEY=your_api_key_here

# Model Configuration (Default: qwen-max)
AI_DEFAULT_MODEL=qwen-max
AI_VISION_MODEL=qwen-vl-max
AI_IMAGE_MODEL=wanx-v1

# Token & Cost Limits
AI_MAX_TOKENS=32000
AI_DAILY_BUDGET=50
AI_MONTHLY_BUDGET=1000

# Timeout Settings
AI_REQUEST_TIMEOUT=120000

# Business Configuration
BUSINESS_NAME=88Away LLC
KDP_MARKETPLACE=US
AFFILIATE_NETWORKS=amazon,shareasale,direct
```

## AI Agents Overview

### 1. Market Intelligence Agent
**File:** `src/services/marketIntelligenceAgent.js`

**Capabilities:**
- Niche profitability analysis
- Competitor cover visual analysis (Qwen-VL-Max)
- Keyword strategy generation
- Trend detection
- Gap analysis

**AI Models Used:**
- `qwen-max` - Text reasoning and analysis
- `qwen-vl-max` - Visual competitor analysis

**Key Methods:**
```javascript
analyzeNicheProfitability(niche)
analyzeCompetitorCover(imageUrl, niche)
generateKeywordStrategy(niche, existingKeywords)
detectEmergingTrends()
analyzeCompetitorGaps(niche, competitors)
runFullMarketAnalysis()
```

### 2. Content Pipeline Agent
**File:** `src/services/contentPipelineAgent.js`

**Capabilities:**
- Complete manuscript generation
- Workbook exercises creation
- Cover design prompts
- Cover image generation (Wanx)
- Book description writing
- Backend keyword optimization
- Quality control checks
- Formatting for publishing

**AI Models Used:**
- `qwen-max` - Content generation (up to 8000 tokens)
- `wanx-v1` - Cover image generation

**Key Methods:**
```javascript
generateManuscript(bookSpec)
generateWorkbookExercises(topic, count)
generateCoverDesignPrompt(bookSpec)
generateCoverImage(prompt, outputPath)
generateBookDescription(bookSpec)
generateBackendKeywords(niche)
performQualityCheck(content, contentType)
formatForPublishing(manuscript)
runContentPipeline(bookSpec)
```

### 3. Revenue Optimizer Agent
**File:** `src/services/revenueOptimizerAgent.js`

**Capabilities:**
- Optimal price calculation
- Dynamic pricing strategy
- Amazon Ads optimization
- Revenue diversification analysis
- Bundle strategy generation
- Revenue forecasting

**AI Models Used:**
- `qwen-max` - Predictive analytics and strategy

**Key Methods:**
```javascript
calculateOptimalPrice(bookData)
generateDynamicPricingStrategy(books, marketConditions)
optimizeAdCampaign(campaignData)
analyzeRevenueDiversification(revenueData)
generateBundleStrategy(books)
forecastRevenue(historicalData, growthFactors)
runRevenueOptimization(portfolio)
```

### 4. KDP Agent
**File:** `src/services/kdpAgent.js`

**Capabilities:**
- Book sales tracking
- Royalty monitoring
- BSR tracking
- Review monitoring
- Monthly royalty calculation

### 5. Affiliate Agent
**File:** `src/services/affiliateAgent.js`

**Capabilities:**
- Multi-network campaign tracking
- Commission analytics
- Conversion rate monitoring
- Payout tracking
- Anomaly detection

### 6. Business Orchestrator
**File:** `src/services/businessOrchestrator.js`

**Coordinates all agents with:**
- Unified metrics dashboard
- Cross-agent insights
- Alert system
- Executive summaries
- Real-time event broadcasting

## API Endpoints

### AI-Powered Endpoints

| Endpoint | Method | Description | AI Model |
|----------|--------|-------------|----------|
| `/api/ai/analyze-niche` | POST | Analyze KDP niche profitability | qwen-max |
| `/api/ai/analyze-cover` | POST | Visual analysis of book covers | qwen-vl-max |
| `/api/ai/generate-manuscript` | POST | Generate complete book manuscript | qwen-max |
| `/api/ai/generate-cover` | POST | Generate book cover image | wanx-v1 |
| `/api/ai/optimize-price` | POST | Calculate optimal book price | qwen-max |
| `/api/ai/optimize-ads` | POST | Optimize Amazon Ads campaign | qwen-max |
| `/api/ai/business-insights` | GET | Unified business insights | qwen-max |

### Business Data Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/metrics` | GET | Unified business metrics |
| `/api/kdp/books` | GET | All tracked KDP books |
| `/api/kdp/metrics` | GET | KDP-specific metrics |
| `/api/affiliate/campaigns` | GET | All affiliate campaigns |
| `/api/insights` | GET | AI-generated insights |
| `/api/alerts` | GET | Recent alerts |
| `/api/reports/revenue` | GET | Revenue reports |
| `/api/executive-summary` | GET | Executive summary |

## Usage Examples

### Analyze a Niche
```bash
curl -X POST http://localhost:3000/api/ai/analyze-niche \
  -H "Content-Type: application/json" \
  -d '{"niche": "mental health journals"}'
```

### Generate Book Cover
```bash
curl -X POST http://localhost:3000/api/ai/generate-cover \
  -H "Content-Type: application/json" \
  -d '{
    "title": "AI Productivity Planner",
    "niche": "productivity",
    "contentType": "low-content"
  }'
```

### Get Executive Summary
```bash
curl http://localhost:3000/api/executive-summary
```

## Cost Structure (Alibaba Cloud DashScope)

| Model | Input Cost | Output Cost | Context | Use Case |
|-------|-----------|-------------|---------|----------|
| qwen-turbo | $0.002/1K | $0.006/1K | 8K | Simple tasks |
| qwen-plus | $0.004/1K | $0.012/1K | 32K | Standard tasks |
| **qwen-max** | **$0.012/1K** | **$0.036/1K** | **32K** | **Complex reasoning (Default)** |
| qwen-vl-max | $0.020/1K | $0.060/1K | 32K | Visual analysis |
| wanx-v1 | $0.04/image | - | - | Image generation |

## Best Practices

1. **Token Management**: Use appropriate model for task complexity
2. **Caching**: Cache AI responses for repeated queries
3. **Error Handling**: Implement retry logic with exponential backoff
4. **Rate Limiting**: Respect API rate limits
5. **Cost Monitoring**: Track daily/monthly spending
6. **Human Review**: Always review AI-generated content before publishing

## Security Notes

- Never expose DASHSCOPE_API_KEY in client-side code
- Use environment variables for all sensitive configuration
- Implement request validation on all AI endpoints
- Monitor for unusual API usage patterns

---
*Powered by Qwen3.8-Max Multi-Modal AI | 88Away LLC*
