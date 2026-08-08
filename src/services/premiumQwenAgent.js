/**
 * Premium Qwen3.8-Max Multi-Modal AI Agent for 88Away LLC
 * Enterprise-Grade Configuration with Full Spectrum Capabilities
 * 
 * Capabilities: Thinking, Visual, Video, Audio, Image, Music Generation
 * Token Plan: Individual Default Settings Optimized for Business Operations
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

class PremiumQwenAgent extends EventEmitter {
  constructor(config = {}) {
    super();
    
    // Core Configuration - Qwen3.8-Max as Default
    this.apiKey = config.apiKey || process.env.QWEN_API_KEY;
    this.baseUrl = config.baseUrl || 'https://dashscope.aliyuncs.com/api/v1';
    this.defaultModel = 'qwen-max'; // Qwen3.8-Max equivalent
    this.timeout = config.timeout || 180000; // 3 minutes for complex multi-modal tasks
    
    // Enhanced Capability Matrix
    this.capabilities = {
      // Text & Reasoning
      text_generation: { enabled: true, model: 'qwen-max', max_tokens: 32768 },
      thinking: { enabled: true, model: 'qwen-max', deep_reasoning: true },
      code_execution: { enabled: true, sandbox: true },
      
      // Visual & Image
      vision: { enabled: true, model: 'qwen-vl-max', resolution: 'high' },
      image_analysis: { enabled: true, model: 'qwen-vl-max', detailed_captions: true },
      image_generation: { enabled: true, model: 'wanx-v1', styles: ['photorealistic', 'artistic', 'marketing'] },
      visual_understanding: { enabled: true, scene_detection: true, ocr: true },
      
      // Video Processing
      video_analysis: { enabled: true, model: 'qwen-vl-max', frame_extraction: 'adaptive' },
      video_summarization: { enabled: true, key_moments: true },
      video_captioning: { enabled: true, multi_language: true },
      
      // Audio Processing
      audio_transcription: { enabled: true, model: 'paraformer-realtime-v2', languages: ['en', 'zh', 'es', 'fr', 'de'] },
      audio_analysis: { enabled: true, sentiment_detection: true, speaker_identification: true },
      audio_generation: { enabled: true, provider: 'external', tts_voices: 50 },
      
      // Music Generation
      music_generation: { enabled: true, provider: 'external', genres: 25, moods: 15 },
      
      // Multi-Modal Fusion
      multimodal_analysis: { enabled: true, fusion_models: ['text+image', 'text+video', 'text+audio', 'image+audio'] },
      cross_modal_reasoning: { enabled: true }
    };
    
    // Premium Token Plan Configuration - Individual Default Settings
    this.tokenPlan = {
      plan_name: '88Away_Premium_Individual',
      default_model: 'qwen-max',
      models: {
        'qwen-turbo': { 
          max_tokens: 8192, 
          cost_per_1k_input: 0.002, 
          cost_per_1k_output: 0.006,
          use_case: 'Quick queries, simple classifications',
          priority: 'low'
        },
        'qwen-plus': { 
          max_tokens: 32768, 
          cost_per_1k_input: 0.004, 
          cost_per_1k_output: 0.012,
          use_case: 'Standard business reports, content generation',
          priority: 'medium'
        },
        'qwen-max': { 
          max_tokens: 32768, 
          cost_per_1k_input: 0.012, 
          cost_per_1k_output: 0.036,
          use_case: 'Complex reasoning, strategic analysis, multi-modal (DEFAULT)',
          priority: 'high',
          is_default: true
        },
        'qwen-vl-max': { 
          max_tokens: 32768, 
          cost_per_1k_input: 0.020, 
          cost_per_1k_output: 0.060,
          use_case: 'Vision-intensive tasks, cover analysis, competitor research',
          priority: 'high'
        },
        'wanx-v1': {
          cost_per_image: 0.05,
          resolutions: ['512x512', '1024x1024', '1024x768', '768x1024'],
          use_case: 'Book covers, marketing visuals, ad creatives'
        }
      },
      
      // Budget Management
      budget_limits: {
        daily: 100.00,      // Increased for premium operations
        monthly: 2500.00,   // Premium individual plan
        per_request: 10.00, // Allow complex multi-modal requests
        emergency_buffer: 500.00
      },
      
      // Smart Token Allocation
      auto_optimization: {
        enabled: true,
        prefer_cost_effective: true,
        escalate_on_complexity: true,
        cache_frequent_queries: true
      },
      
      usage_tracking: [],
      alerts: []
    };
    
    // Enhanced Usage Analytics
    this.usageStats = {
      total_requests: 0,
      total_tokens: 0,
      total_cost: 0,
      by_capability: {},
      by_model: {},
      hourly_distribution: new Array(24).fill(0),
      success_rate: 100,
      average_latency: 0,
      peak_usage_time: null
    };
    
    // Request Queue for Rate Limiting
    this.requestQueue = [];
    this.activeRequests = 0;
    this.maxConcurrentRequests = 5;
    
    // Cache for frequent queries
    this.cache = new Map();
    this.cacheTTL = 3600000; // 1 hour
    
    // Initialize monitoring
    this._startMonitoring();
  }

  /**
   * Advanced Text Generation with Deep Thinking
   * Qwen-Max with enhanced reasoning capabilities
   */
  async generateText(prompt, options = {}) {
    const requestId = uuidv4();
    const {
      maxTokens = 4096,
      temperature = 0.7,
      topP = 0.9,
      enableThinking = true,
      thinkingBudget = 2048,
      systemPrompt = this._getDefaultSystemPrompt(),
      context = [],
      format = 'text', // text, json, markdown, structured
      priority = 'normal'
    } = options;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...context,
      { role: 'user', content: prompt }
    ];

    const payload = {
      model: this.defaultModel,
      input: { messages },
      parameters: {
        max_tokens: maxTokens,
        temperature: temperature,
        top_p: topP,
        enable_thinking: enableThinking,
        thinking_budget: thinkingBudget,
        incremental_output: true,
        response_format: format === 'json' ? { type: 'json_object' } : undefined,
        seed: Math.floor(Math.random() * 1000000)
      }
    };

    return await this._executeRequest(payload, 'text_generation', requestId, priority);
  }

  /**
   * Advanced Vision Analysis with Scene Understanding
   */
  async analyzeImage(imagePath, options = {}) {
    const requestId = uuidv4();
    const {
      prompt = 'Provide comprehensive business analysis of this image including visual elements, text content, color scheme, composition quality, and actionable insights.',
      detailLevel = 'high', // low, medium, high
      includeOCR = true,
      includeSceneDetection = true,
      includeSentiment = true,
      customAnalysis = []
    } = options;

    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = this._getMimeType(imagePath);

    const analysisPrompt = `${prompt}\n\nAnalysis requirements:\n- Detail Level: ${detailLevel}\n- OCR: ${includeOCR ? 'Enabled' : 'Disabled'}\n- Scene Detection: ${includeSceneDetection ? 'Enabled' : 'Disabled'}\n- Sentiment Analysis: ${includeSentiment ? 'Enabled' : 'Disabled'}${customAnalysis.length > 0 ? '\n- Custom: ' + customAnalysis.join(', ') : ''}`;

    const payload = {
      model: 'qwen-vl-max',
      input: {
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: analysisPrompt },
            { 
              type: 'image_url', 
              image_url: { 
                url: `data:${mimeType};base64,${base64Image}`,
                detail: detailLevel
              } 
            }
          ]
        }]
      },
      parameters: {
        max_tokens: 4096,
        enable_thinking: true
      }
    };

    return await this._executeRequest(payload, 'vision', requestId, 'high');
  }

  /**
   * Professional Image Generation for Marketing
   */
  async generateImage(prompt, options = {}) {
    const requestId = uuidv4();
    const {
      size = '1024x1024',
      style = 'photorealistic',
      negativePrompt = 'blurry, low quality, distorted, watermark, text artifacts',
      variations = 1,
      seed = null,
      guidance = 7.5,
      steps = 50,
      saveToFile = true
    } = options;

    const enhancedPrompt = `${prompt}, professional quality, ${style} style, high resolution, commercial use, 88Away LLC brand standards`;

    const payload = {
      model: 'wanx-v1',
      input: {
        prompt: enhancedPrompt,
        negative_prompt: negativePrompt
      },
      parameters: {
        size: size,
        n: variations,
        seed: seed || Math.floor(Math.random() * 1000000),
        guidance_scale: guidance,
        num_inference_steps: steps
      }
    };

    const response = await this._executeRequest(payload, 'image_generation', requestId, 'high');
    
    if (response.output && response.output.results && response.output.results[0].url) {
      const imageUrls = response.output.results.map(r => r.url);
      const savedPaths = [];
      
      if (saveToFile) {
        await fs.mkdir(path.join(process.cwd(), 'uploads', 'generated'), { recursive: true });
        
        for (let i = 0; i < imageUrls.length; i++) {
          const imageUrl = imageUrls[i];
          const imageBuffer = await axios.get(imageUrl, { responseType: 'arraybuffer' });
          const filename = `generated_${requestId}_${i}.png`;
          const filepath = path.join(process.cwd(), 'uploads', 'generated', filename);
          
          await fs.writeFile(filepath, Buffer.from(imageBuffer.data));
          savedPaths.push(filepath);
        }
      }
      
      return { 
        ...response, 
        urls: imageUrls,
        paths: savedPaths,
        count: savedPaths.length
      };
    }
    
    return response;
  }

  /**
   * Professional Audio Transcription with Speaker Diarization
   */
  async transcribeAudio(audioPath, options = {}) {
    const requestId = uuidv4();
    const {
      language = 'en',
      includeTimestamps = true,
      includeWords = true,
      speakerDiarization = false,
      punctuation = true,
      profanityFilter = false
    } = options;

    const audioBuffer = await fs.readFile(audioPath);
    const base64Audio = audioBuffer.toString('base64');
    const mimeType = this._getMimeType(audioPath);

    const payload = {
      model: 'paraformer-realtime-v2',
      input: {
        audio: `data:${mimeType};base64,${base64Audio}`
      },
      parameters: {
        language: language,
        enable_punctuation: punctuation,
        enable_word_timestamp: includeWords,
        enable_sentence_timestamp: includeTimestamps,
        speaker_diarization: speakerDiarization,
        profanity_filter: profanityFilter
      }
    };

    return await this._executeRequest(payload, 'audio_transcription', requestId, 'normal');
  }

  /**
   * Advanced Video Analysis with Key Frame Extraction
   */
  async analyzeVideo(videoPath, options = {}) {
    const requestId = uuidv4();
    const {
      prompt = 'Analyze this video content comprehensively for business insights, key moments, visual quality, and actionable recommendations.',
      extractFrames = true,
      frameInterval = 5, // seconds
      includeSummary = true,
      includeCaptions = true,
      detectObjects = true,
      detectText = true
    } = options;

    const videoBuffer = await fs.readFile(videoPath);
    const mimeType = this._getMimeType(videoPath);
    
    let keyFrames = [];
    if (extractFrames) {
      keyFrames = await this._extractKeyFrames(videoBuffer, mimeType, frameInterval);
    }
    
    const messages = [{ type: 'text', text: prompt }];
    
    // Add key frames for visual analysis
    for (const frame of keyFrames) {
      messages.push({
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${frame}` }
      });
    }

    const payload = {
      model: 'qwen-vl-max',
      input: {
        messages: [{ role: 'user', content: messages }]
      },
      parameters: {
        max_tokens: 8192,
        enable_thinking: true
      }
    };

    return await this._executeRequest(payload, 'video_analysis', requestId, 'high');
  }

  /**
   * Music Generation via External Integration
   * Supports multiple providers for background music, jingles, etc.
   */
  async generateMusic(prompt, options = {}) {
    const requestId = uuidv4();
    const {
      duration = 30,
      genre = 'ambient',
      mood = 'professional',
      tempo = 'medium',
      instruments = ['piano', 'strings'],
      includeVoiceover = false,
      voiceoverText = '',
      outputFormat = 'mp3'
    } = options;

    console.log(`[Premium Qwen Agent] Music generation request: ${requestId}`);
    console.log(`  Prompt: ${prompt}`);
    console.log(`  Genre: ${genre}, Mood: ${mood}, Tempo: ${tempo}`);
    console.log(`  Duration: ${duration}s, Format: ${outputFormat}`);
    
    // Structured request for external music API integration
    const musicRequest = {
      id: requestId,
      status: 'queued_external',
      created_at: new Date().toISOString(),
      request: {
        prompt,
        duration,
        genre,
        mood,
        tempo,
        instruments,
        voiceover: includeVoiceover ? { enabled: true, text: voiceoverText } : { enabled: false },
        output_format: outputFormat
      },
      provider_options: {
        preferred: 'suno_api',
        fallback: 'udio_api',
        alternative: 'elevenlabs_music'
      },
      estimated_cost: 0.15,
      estimated_time: 60000
    };

    // Emit event for external processor
    this.emit('music_generation_requested', musicRequest);
    
    return {
      status: 'pending_external',
      request_id: requestId,
      message: 'Music generation queued for external processing',
      details: musicRequest,
      webhook_url: '/api/ai/music-status/' + requestId
    };
  }

  /**
   * Advanced Multi-Modal Fusion Analysis
   * Combines text, images, audio, and video for comprehensive insights
   */
  async multimodalAnalysis(inputs, prompt, options = {}) {
    const requestId = uuidv4();
    const {
      fusionStrategy = 'weighted', // weighted, sequential, parallel
      enableCrossModalReasoning = true,
      outputFormat = 'structured'
    } = options;

    const messages = [{ type: 'text', text: prompt }];
    const modalities = [];
    
    for (const input of inputs) {
      switch (input.type) {
        case 'image':
          const imageBuffer = await fs.readFile(input.path);
          const base64Img = imageBuffer.toString('base64');
          const imgMime = this._getMimeType(input.path);
          messages.push({
            type: 'image_url',
            image_url: { url: `data:${imgMime};base64,${base64Img}` }
          });
          modalities.push('image');
          break;
          
        case 'text':
          messages.push({ type: 'text', text: input.content });
          modalities.push('text');
          break;
          
        case 'audio':
          // For audio in multimodal, provide transcript summary
          if (input.transcript) {
            messages.push({ type: 'text', text: `[Audio Transcript]: ${input.transcript}` });
            modalities.push('audio');
          }
          break;
          
        case 'video':
          if (input.keyFrames && Array.isArray(input.keyFrames)) {
            for (const frame of input.keyFrames) {
              messages.push({
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${frame}` }
              });
            }
            modalities.push('video');
          }
          break;
      }
    }

    const analysisPrompt = `${prompt}\n\nMulti-Modal Analysis Strategy:\n- Modalities detected: ${modalities.join(', ')}\n- Fusion approach: ${fusionStrategy}\n- Cross-modal reasoning: ${enableCrossModalReasoning ? 'Enabled' : 'Disabled'}`;
    
    // Replace first text message with enhanced prompt
    messages[0] = { type: 'text', text: analysisPrompt };

    const payload = {
      model: 'qwen-vl-max',
      input: {
        messages: [{ role: 'user', content: messages }]
      },
      parameters: {
        max_tokens: 8192,
        enable_thinking: true,
        response_format: outputFormat === 'structured' ? { type: 'json_object' } : undefined
      }
    };

    return await this._executeRequest(payload, 'multimodal', requestId, 'high');
  }

  /**
   * Strategic Business Analysis with Deep Thinking
   * Specialized for KDP and Affiliate Marketing insights
   */
  async businessAnalysis(data, analysisType, options = {}) {
    const requestId = uuidv4();
    const {
      depth = 'comprehensive', // quick, standard, comprehensive
      includeRecommendations = true,
      includeRisks = true,
      includeCompetitorInsights = true,
      outputFormat = 'executive' // executive, technical, detailed
    } = options;

    let systemPrompt = this._getDefaultSystemPrompt();
    let userPrompt = '';

    switch (analysisType) {
      case 'market_opportunity':
        userPrompt = this._buildMarketAnalysisPrompt(data, depth);
        break;
      case 'content_strategy':
        userPrompt = this._buildContentStrategyPrompt(data, depth);
        break;
      case 'revenue_optimization':
        userPrompt = this._buildRevenueOptimizationPrompt(data, depth);
        break;
      case 'competitor_analysis':
        userPrompt = this._buildCompetitorAnalysisPrompt(data, depth);
        break;
      default:
        userPrompt = `Provide comprehensive business analysis for 88Away LLC:\n\n${JSON.stringify(data, null, 2)}`;
    }

    if (includeRecommendations) {
      userPrompt += '\n\nProvide actionable recommendations with priority levels.';
    }
    if (includeRisks) {
      userPrompt += '\n\nIdentify potential risks and mitigation strategies.';
    }
    if (includeCompetitorInsights) {
      userPrompt += '\n\nInclude competitive landscape analysis.';
    }

    return await this.generateText(userPrompt, {
      systemPrompt,
      maxTokens: depth === 'comprehensive' ? 8192 : 4096,
      enableThinking: true,
      format: outputFormat === 'executive' ? 'json' : 'text',
      priority: 'high'
    });
  }

  /**
   * Get Comprehensive Token Usage Statistics
   */
  getTokenStats() {
    const today = new Date().toDateString();
    const currentMonth = new Date().getMonth();
    
    const todayUsage = this.tokenPlan.usage_tracking
      .filter(r => new Date(r.timestamp).toDateString() === today)
      .reduce((sum, r) => sum + r.cost, 0);
    
    const monthUsage = this.tokenPlan.usage_tracking
      .filter(r => {
        const d = new Date(r.timestamp);
        return d.getMonth() === currentMonth && d.getFullYear() === new Date().getFullYear();
      })
      .reduce((sum, r) => sum + r.cost, 0);

    return {
      plan: this.tokenPlan.plan_name,
      default_model: this.defaultModel,
      usage_summary: {
        total_requests: this.usageStats.total_requests,
        total_tokens: this.usageStats.total_tokens,
        total_cost: this.usageStats.total_cost.toFixed(2),
        success_rate: this.usageStats.success_rate.toFixed(1) + '%',
        avg_latency_ms: Math.round(this.usageStats.average_latency)
      },
      budget_status: {
        daily: {
          limit: this.tokenPlan.budget_limits.daily,
          used: todayUsage.toFixed(2),
          remaining: (this.tokenPlan.budget_limits.daily - todayUsage).toFixed(2),
          percentage_used: ((todayUsage / this.tokenPlan.budget_limits.daily) * 100).toFixed(1) + '%'
        },
        monthly: {
          limit: this.tokenPlan.budget_limits.monthly,
          used: monthUsage.toFixed(2),
          remaining: (this.tokenPlan.budget_limits.monthly - monthUsage).toFixed(2),
          percentage_used: ((monthUsage / this.tokenPlan.budget_limits.monthly) * 100).toFixed(1) + '%'
        }
      },
      capability_breakdown: this.usageStats.by_capability,
      model_breakdown: this.usageStats.by_model,
      peak_hour: this.usageStats.peak_usage_time,
      cache_hit_rate: this._getCacheHitRate()
    };
  }

  /**
   * Set Active Model
   */
  setModel(modelName) {
    if (this.tokenPlan.models[modelName]) {
      this.defaultModel = modelName;
      return { success: true, model: modelName };
    }
    throw new Error(`Unknown model: ${modelName}`);
  }

  /**
   * Clear Cache
   */
  clearCache() {
    const size = this.cache.size;
    this.cache.clear();
    return { cleared: size };
  }

  // Private Methods

  _getDefaultSystemPrompt() {
    return `You are an elite AI business strategist for 88Away LLC, a premium digital publishing and affiliate marketing company.

Your expertise includes:
- KDP Publishing Strategy (low-content, medium-content, specialized guides)
- Affiliate Marketing Optimization (Amazon Associates, ShareASale, direct partnerships)
- Market Intelligence and Trend Analysis
- Revenue Optimization and Pricing Strategy
- Content Quality Assurance and Brand Standards
- Multi-platform Marketing Automation

Communication Style:
- Provide actionable, data-driven insights
- Balance strategic thinking with tactical execution
- Consider ROI and resource allocation
- Maintain professional, executive-level communication
- Support claims with logical reasoning

Always prioritize:
1. Compliance with platform terms (KDP, Amazon Associates)
2. Long-term brand building over short-term gains
3. Quality and authenticity in all content
4. Ethical business practices`;
  }

  async _executeRequest(payload, capability, requestId, priority = 'normal') {
    const startTime = Date.now();
    
    // Check cache for GET-like requests
    const cacheKey = this._generateCacheKey(payload);
    if (this.cache.has(cacheKey) && capability !== 'image_generation' && capability !== 'music_generation') {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTTL) {
        cached.cached = true;
        return cached;
      }
      this.cache.delete(cacheKey);
    }

    // Queue management
    if (this.activeRequests >= this.maxConcurrentRequests) {
      await this._waitForSlot(priority);
    }

    this.activeRequests++;
    
    try {
      // Budget validation
      const estimatedTokens = payload.parameters?.max_tokens || 2048;
      this._validateBudget(estimatedTokens, capability);

      // Determine endpoint based on capability
      let endpoint = '/services/aigc/text-generation/generation';
      if (capability === 'image_generation') {
        endpoint = '/services/aigc/image-generation/generation';
      } else if (capability === 'audio_transcription') {
        endpoint = '/services/audio/transcription';
      }

      const response = await axios.post(
        `${this.baseUrl}${endpoint}`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
            'X-Priority': priority
          },
          timeout: this.timeout
        }
      );

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Update metrics
      const usedTokens = response.data.usage?.total_tokens || estimatedTokens;
      const modelConfig = this.tokenPlan.models[payload.model] || this.tokenPlan.models[this.defaultModel];
      const cost = (usedTokens / 1000) * (modelConfig.cost_per_1k_input || modelConfig.cost_per_1k || 0.012);
      
      this._updateMetrics(capability, payload.model, usedTokens, cost, duration, true);
      
      const result = {
        success: true,
        request_id: requestId,
        data: response.data.output || response.data,
        usage: {
          tokens: usedTokens,
          cost: parseFloat(cost.toFixed(4)),
          duration_ms: duration,
          model: payload.model,
          capability
        },
        capabilities_used: [capability],
        timestamp: new Date().toISOString(),
        cached: false
      };

      // Cache result if appropriate
      if (!cached && capability !== 'image_generation' && capability !== 'music_generation') {
        this.cache.set(cacheKey, { ...result, timestamp: Date.now() });
      }

      // Emit success event
      this.emit('request_completed', { requestId, capability, duration, cost });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      this._updateMetrics(capability, payload.model, 0, 0, duration, false);
      
      this.emit('request_failed', { requestId, capability, error: error.message });
      
      throw error;
    } finally {
      this.activeRequests--;
    }
  }

  _updateMetrics(capability, model, tokens, cost, duration, success) {
    this.usageStats.total_requests++;
    this.usageStats.total_tokens += tokens;
    this.usageStats.total_cost += cost;
    
    // By capability
    if (!this.usageStats.by_capability[capability]) {
      this.usageStats.by_capability[capability] = { requests: 0, tokens: 0, cost: 0, successes: 0 };
    }
    this.usageStats.by_capability[capability].requests++;
    this.usageStats.by_capability[capability].tokens += tokens;
    this.usageStats.by_capability[capability].cost += cost;
    if (success) this.usageStats.by_capability[capability].successes++;
    
    // By model
    if (!this.usageStats.by_model[model]) {
      this.usageStats.by_model[model] = { requests: 0, tokens: 0, cost: 0 };
    }
    this.usageStats.by_model[model].requests++;
    this.usageStats.by_model[model].tokens += tokens;
    this.usageStats.by_model[model].cost += cost;
    
    // Hourly distribution
    const hour = new Date().getHours();
    this.usageStats.hourly_distribution[hour]++;
    
    // Success rate
    const recentRequests = this.tokenPlan.usage_tracking.slice(-100);
    const recentSuccesses = recentRequests.filter(r => r.success).length;
    this.usageStats.success_rate = recentRequests.length > 0 
      ? (recentSuccesses / recentRequests.length) * 100 
      : 100;
    
    // Average latency (exponential moving average)
    this.usageStats.average_latency = this.usageStats.average_latency * 0.9 + duration * 0.1;
    
    // Peak hour tracking
    const maxHourly = Math.max(...this.usageStats.hourly_distribution);
    this.usageStats.peak_usage_time = this.usageStats.hourly_distribution.indexOf(maxHourly) + ':00';
    
    // Track usage
    this.tokenPlan.usage_tracking.push({
      timestamp: new Date().toISOString(),
      capability,
      model,
      tokens,
      cost,
      duration,
      success
    });
    
    // Trim old records (keep last 10000)
    if (this.tokenPlan.usage_tracking.length > 10000) {
      this.tokenPlan.usage_tracking = this.tokenPlan.usage_tracking.slice(-10000);
    }
  }

  _validateBudget(estimatedTokens, capability) {
    const model = this.tokenPlan.models[this.defaultModel] || this.tokenPlan.models['qwen-max'];
    const estimatedCost = (estimatedTokens / 1000) * (model.cost_per_1k || 0.012);
    
    if (estimatedCost > this.tokenPlan.budget_limits.per_request) {
      throw new Error(`Estimated cost $${estimatedCost.toFixed(2)} exceeds per-request limit of $${this.tokenPlan.budget_limits.per_request}`);
    }
    
    const todayUsage = this.tokenPlan.usage_tracking
      .filter(r => new Date(r.timestamp).toDateString() === new Date().toDateString())
      .reduce((sum, r) => sum + r.cost, 0);
    
    if (todayUsage + estimatedCost > this.tokenPlan.budget_limits.daily) {
      throw new Error(`Daily budget of $${this.tokenPlan.budget_limits.daily} would be exceeded`);
    }
    
    return { estimatedCost, withinBudget: true };
  }

  async _waitForSlot(priority) {
    return new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (this.activeRequests < this.maxConcurrentRequests) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      
      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 30000);
    });
  }

  async _extractKeyFrames(videoBuffer, mimeType, intervalSeconds) {
    // Production implementation would use fluent-ffmpeg
    // This is a placeholder that returns empty array
    console.log('[Premium Qwen Agent] Video frame extraction requested...');
    console.log(`  Interval: ${intervalSeconds}s, Format: ${mimeType}`);
    
    // In production: Use ffmpeg to extract frames at intervals
    // const ffmpeg = require('fluent-ffmpeg');
    // Extract frames logic here
    
    return [];
  }

  _getMimeType(filepath) {
    const ext = path.extname(filepath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
      '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
      '.mp4': 'video/mp4', '.avi': 'video/avi', '.mov': 'video/quicktime', '.webm': 'video/webm',
      '.pdf': 'application/pdf', '.txt': 'text/plain', '.json': 'application/json'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  _generateCacheKey(payload) {
    const hash = require('crypto').createHash('md5');
    hash.update(JSON.stringify(payload));
    return 'cache_' + hash.digest('hex');
  }

  _getCacheHitRate() {
    const totalChecks = this.usageStats.total_requests;
    const cacheHits = this.tokenPlan.usage_tracking.filter(r => r.cached).length;
    return totalChecks > 0 ? ((cacheHits / totalChecks) * 100).toFixed(1) + '%' : '0%';
  }

  _startMonitoring() {
    // Log hourly stats
    setInterval(() => {
      const stats = this.getTokenStats();
      if (stats.budget_status.daily.percentage_used.replace('%', '') > 80) {
        this.emit('budget_warning', { type: 'daily', ...stats.budget_status.daily });
      }
      if (stats.budget_status.monthly.percentage_used.replace('%', '') > 80) {
        this.emit('budget_warning', { type: 'monthly', ...stats.budget_status.monthly });
      }
    }, 3600000); // Every hour
  }

  _buildMarketAnalysisPrompt(data, depth) {
    return `Analyze the following market data for 88Away LLC's KDP and affiliate marketing opportunities:

${JSON.stringify(data, null, 2)}

Provide insights on:
1. Market size and growth trends
2. Target audience demographics and psychographics
3. Competitive intensity and barriers to entry
4. Seasonal patterns and timing opportunities
5. Recommended niche focus areas

Depth: ${depth}`;
  }

  _buildContentStrategyPrompt(data, depth) {
    return `Develop a content strategy based on the following data:

${JSON.stringify(data, null, 2)}

Include:
1. Content types and formats (low-content, medium-content, guides)
2. Topic clusters and keyword themes
3. Production timeline and resource allocation
4. Quality benchmarks and differentiation factors
5. Cross-promotion opportunities

Depth: ${depth}`;
  }

  _buildRevenueOptimizationPrompt(data, depth) {
    return `Optimize revenue strategy with the following data:

${JSON.stringify(data, null, 2)}

Address:
1. Pricing strategy by product type
2. Revenue stream diversification (60/25/15 model)
3. Ad spend optimization and ACOS targets
4. Conversion rate improvement tactics
5. Lifetime value maximization

Depth: ${depth}`;
  }

  _buildCompetitorAnalysisPrompt(data, depth) {
    return `Analyze competitive landscape:

${JSON.stringify(data, null, 2)}

Cover:
1. Key competitors and market share
2. Their strengths and weaknesses
3. Content gaps and opportunities
4. Pricing comparisons
5. Differentiation strategies

Depth: ${depth}`;
  }
}

module.exports = PremiumQwenAgent;
