# Qwen AI Premium Agent for 88Away LLC

## Overview
This platform integrates **Qwen Max** (Alibaba's premium AI model) with full multi-modal capabilities for tracking and optimizing 88Away LLC's KDP publishing and affiliate marketing business.

## 🚀 Qwen Multi-Modal Capabilities

### ✅ Configured Capabilities

| Capability | Status | Model | Description |
|------------|--------|-------|-------------|
| **Thinking/Reasoning** | ✅ Enabled | qwen-max | Advanced reasoning with chain-of-thought |
| **Text Generation** | ✅ Enabled | qwen-max | Business insights, summaries, recommendations |
| **Vision/Image Analysis** | ✅ Enabled | qwen-vl-max | Book cover analysis, chart interpretation |
| **Image Generation** | ✅ Enabled | wanx-v1 | Marketing creatives, ad visuals |
| **Audio Transcription** | ✅ Enabled | paraformer-realtime-v2 | Podcast/meeting transcription |
| **Video Analysis** | ✅ Enabled | qwen-vl-max | Marketing video evaluation |
| **Music Generation** | ⏳ External | API Integration | Background music for content |
| **Multi-Modal Analysis** | ✅ Enabled | qwen-vl-max | Combined text+image+reasoning |

## 📊 Token Plan Configuration

### Default Settings (Qwen-Max)
```javascript
{
  default_model: 'qwen-max',
  models: {
    'qwen-turbo': { max_tokens: 8192, cost_per_1k: $0.002 },
    'qwen-plus': { max_tokens: 32768, cost_per_1k: $0.004 },
    'qwen-max': { max_tokens: 32768, cost_per_1k: $0.012 }, // DEFAULT
    'qwen-vl-max': { max_tokens: 32768, cost_per_1k: $0.020 }
  },
  budget_limits: {
    daily: $50.00,
    monthly: $1000.00,
    per_request: $5.00
  }
}
```

## 🔧 Setup Instructions

### 1. Install Dependencies
```bash
npm install @anthropic-ai/sdk openai axios sharp fluent-ffmpeg
```

### 2. Configure Environment Variables
Edit `.env` file:
```bash
# Qwen AI Configuration
QWEN_API_KEY=your_dashscope_api_key
QWEN_MODEL=qwen-max
QWEN_BASE_URL=https://dashscope.aliyuncs.com/api/v1
QWEN_TIMEOUT_MS=120000

# Budget Limits
QWEN_DAILY_BUDGET=50.00
QWEN_MONTHLY_BUDGET=1000.00
QWEN_PER_REQUEST_BUDGET=5.00
```

### 3. Get API Key
1. Visit [Alibaba DashScope](https://dashscope.console.aliyun.com/)
2. Create account / Login
3. Navigate to API Keys
4. Generate new API key
5. Add to `.env` file

## 📡 API Endpoints

### Business Metrics
```
GET /api/metrics           - Unified business metrics
GET /api/insights          - AI-powered business insights
GET /api/executive-summary - Executive summary report
```

### Multi-Modal Operations
```
POST /api/ai/analyze-image     - Analyze book covers, charts, creatives
POST /api/ai/generate-image    - Generate marketing images
POST /api/ai/transcribe-audio  - Transcribe podcasts/meetings
POST /api/ai/analyze-video     - Analyze marketing videos
POST /api/ai/generate-music    - Generate background music
POST /api/ai/multimodal        - Combined multi-modal analysis
```

### AI Usage & Billing
```
GET /api/ai/usage-stats   - Token usage and cost tracking
GET /api/ai/budget-status - Current budget status
```

## 💡 Use Cases for 88Away LLC

### KDP Publishing
- **Book Cover Analysis**: Upload cover images for AI evaluation
- **Market Positioning**: Analyze BSR trends with AI insights
- **Review Sentiment**: Process reader reviews for themes
- **Title Optimization**: Generate compelling book titles

### Affiliate Marketing
- **Creative Generation**: Create ad visuals automatically
- **Video Analysis**: Evaluate marketing video effectiveness
- **Content Transcription**: Transcribe podcast interviews
- **Performance Insights**: AI-driven campaign optimization

### Business Operations
- **Executive Summaries**: Automated monthly/quarterly reports
- **Meeting Notes**: Transcribe and summarize strategy calls
- **Competitive Analysis**: Multi-modal market research
- **Brand Assets**: Generate marketing materials

## 🔍 Example Usage

### Analyze Book Cover
```javascript
const result = await orchestrator.analyzeImage('covers/my-book.jpg', 'book_cover');
console.log(result.aiAnalysis);
```

### Generate Marketing Image
```javascript
const image = await orchestrator.generateMarketingImage(
  'Professional book promotion banner with laptop and coffee',
  { size: '1024x1024', style: 'photorealistic' }
);
```

### Get AI Insights
```javascript
const insights = await orchestrator.generateInsights();
console.log(insights.aiAnalysis);
console.log(insights.recommendations);
```

### Check Usage & Costs
```javascript
const stats = orchestrator.getAIUsageStats();
console.log(`Total tokens: ${stats.usage.total_tokens}`);
console.log(`Total cost: $${stats.usage.total_cost.toFixed(2)}`);
console.log(`Remaining daily budget: $${stats.remaining_budget.daily}`);
```

## 🛡️ Budget Protection

The system includes automatic budget monitoring:
- **Per-request limits**: Prevents expensive runaway requests
- **Daily caps**: Automatic throttling when daily limit reached
- **Monthly tracking**: Monitor long-term spending
- **Cost estimation**: Preview costs before execution

## 📈 Monitoring Dashboard

Access real-time AI usage at:
```
GET /api/ai/usage-stats
```

Returns:
```json
{
  "usage": {
    "total_requests": 150,
    "total_tokens": 485000,
    "total_cost": 5.82,
    "by_capability": {
      "text": { "requests": 100, "tokens": 320000, "cost": 3.84 },
      "vision": { "requests": 40, "tokens": 150000, "cost": 3.00 },
      "image_generation": { "requests": 10, "tokens": 15000, "cost": 0.18 }
    }
  },
  "remaining_budget": {
    "daily": 44.18,
    "monthly": 994.18
  }
}
```

## 🎯 Best Practices

1. **Cache Results**: Insights are cached for 5 minutes to reduce API calls
2. **Batch Operations**: Combine multiple analyses in single requests
3. **Use Appropriate Models**: 
   - Simple tasks → qwen-turbo
   - Complex reasoning → qwen-max
   - Vision tasks → qwen-vl-max
4. **Monitor Usage**: Check `/api/ai/usage-stats` regularly
5. **Set Alerts**: Configure notifications for budget thresholds

## 📝 Notes

- Music generation requires external API integration (Suno, Udio, etc.)
- Video analysis extracts key frames for processing
- All costs are estimates based on token usage
- Actual API response formats may vary slightly

---

**88Away LLC** - AI-Powered Business Intelligence Platform
Powered by Qwen Max (Alibaba Cloud)
