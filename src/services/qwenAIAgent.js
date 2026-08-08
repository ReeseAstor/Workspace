/**
 * Qwen AI Agent Configuration for 88Away LLC
 * Premium Multi-Modal Capabilities: Video, Audio, Image, Thinking, Visual, Music
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

class QwenAIAgent {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.QWEN_API_KEY;
    this.baseUrl = config.baseUrl || 'https://dashscope.aliyuncs.com/api/v1';
    this.model = config.model || 'qwen-max'; // Default to Qwen-Max (premium)
    this.timeout = config.timeout || 120000; // 2 minutes for complex tasks
    
    // Capability flags
    this.capabilities = {
      text: true,
      thinking: true,
      vision: true,
      image_generation: true,
      image_analysis: true,
      audio_transcription: true,
      audio_generation: false, // Via external API
      video_analysis: true,
      video_generation: false, // Via external API
      music_generation: false, // Via external API
      code_execution: true,
      file_processing: true
    };
    
    // Token planning configuration
    this.tokenPlan = {
      default_model: 'qwen-max',
      models: {
        'qwen-turbo': { max_tokens: 8192, cost_per_1k: 0.002, use_case: 'Simple text tasks' },
        'qwen-plus': { max_tokens: 32768, cost_per_1k: 0.004, use_case: 'Balanced performance' },
        'qwen-max': { max_tokens: 32768, cost_per_1k: 0.012, use_case: 'Complex reasoning, multi-modal' },
        'qwen-vl-max': { max_tokens: 32768, cost_per_1k: 0.020, use_case: 'Vision-intensive tasks' }
      },
      budget_limits: {
        daily: 50.00,
        monthly: 1000.00,
        per_request: 5.00
      },
      usage_tracking: []
    };
    
    this.usageStats = {
      total_requests: 0,
      total_tokens: 0,
      total_cost: 0,
      by_capability: {}
    };
  }

  /**
   * Generate text with enhanced reasoning (Thinking capability)
   */
  async generateText(prompt, options = {}) {
    const {
      maxTokens = 4096,
      temperature = 0.7,
      topP = 0.9,
      enableThinking = true,
      systemPrompt = 'You are an AI business analyst for 88Away LLC, specializing in KDP publishing and affiliate marketing.'
    } = options;

    const payload = {
      model: this.model,
      input: {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ]
      },
      parameters: {
        max_tokens: maxTokens,
        temperature: temperature,
        top_p: topP,
        enable_thinking: enableThinking,
        incremental_output: true
      }
    };

    return await this._makeRequest(payload, 'text');
  }

  /**
   * Analyze images (Vision capability)
   */
  async analyzeImage(imagePath, prompt = 'Describe this image in detail for business analysis.') {
    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = this._getMimeType(imagePath);

    const payload = {
      model: 'qwen-vl-max',
      input: {
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { 
                type: 'image_url', 
                image_url: { url: `data:${mimeType};base64,${base64Image}` } 
              }
            ]
          }
        ]
      },
      parameters: {
        max_tokens: 2048
      }
    };

    return await this._makeRequest(payload, 'vision');
  }

  /**
   * Generate images from text descriptions
   */
  async generateImage(prompt, options = {}) {
    const {
      size = '1024x1024',
      style = 'photorealistic',
      negativePrompt = 'blurry, low quality, distorted'
    } = options;

    const payload = {
      model: 'wanx-v1',
      input: {
        prompt: `${prompt}, professional quality, ${style}`,
        negative_prompt: negativePrompt
      },
      parameters: {
        size: size,
        n: 1,
        seed: Math.floor(Math.random() * 1000000)
      }
    };

    const response = await this._makeRequest(payload, 'image_generation');
    
    // Save generated image
    if (response.output && response.output.results && response.output.results[0].url) {
      const imageUrl = response.output.results[0].url;
      const imageBuffer = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const filename = `generated_${Date.now()}.png`;
      const filepath = path.join(process.cwd(), 'uploads', filename);
      
      await fs.mkdir(path.join(process.cwd(), 'uploads'), { recursive: true });
      await fs.writeFile(filepath, Buffer.from(imageBuffer.data));
      
      return { ...response, filepath, filename };
    }
    
    return response;
  }

  /**
   * Transcribe audio files (Audio capability)
   */
  async transcribeAudio(audioPath, language = 'en') {
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
        enable_punctuation: true,
        enable_word_timestamp: true
      }
    };

    return await this._makeRequest(payload, 'audio_transcription');
  }

  /**
   * Analyze video files (Video capability)
   */
  async analyzeVideo(videoPath, prompt = 'Analyze this video content for business insights.') {
    const videoBuffer = await fs.readFile(videoPath);
    const base64Video = videoBuffer.toString('base64');
    const mimeType = this._getMimeType(videoPath);

    // For video, we extract key frames first
    const keyFrames = await this._extractKeyFrames(videoBuffer, mimeType);
    
    const messages = [{ type: 'text', text: prompt }];
    
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
        max_tokens: 4096
      }
    };

    return await this._makeRequest(payload, 'video_analysis');
  }

  /**
   * Generate music/audio from text description (via external API integration)
   */
  async generateMusic(prompt, options = {}) {
    const {
      duration = 30,
      genre = 'ambient',
      mood = 'professional'
    } = options;

    // Note: Qwen doesn't directly generate music, integrate with external service
    // This is a placeholder for integration with services like Suno, Udio, etc.
    console.log(`[Qwen Agent] Music generation requested: ${prompt}`);
    console.log(`[Qwen Agent] Genre: ${genre}, Mood: ${mood}, Duration: ${duration}s`);
    
    // Return structured request for external processing
    return {
      status: 'pending_external',
      request: {
        prompt,
        duration,
        genre,
        mood,
        provider: 'external_music_api'
      },
      message: 'Music generation requires external API integration. Request queued.'
    };
  }

  /**
   * Multi-modal analysis combining text, image, and reasoning
   */
  async multimodalAnalysis(inputs, prompt) {
    const messages = [{ type: 'text', text: prompt }];
    
    for (const input of inputs) {
      if (input.type === 'image') {
        const buffer = await fs.readFile(input.path);
        const base64 = buffer.toString('base64');
        const mimeType = this._getMimeType(input.path);
        messages.push({
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${base64}` }
        });
      } else if (input.type === 'text') {
        messages.push({ type: 'text', text: input.content });
      }
    }

    const payload = {
      model: 'qwen-vl-max',
      input: {
        messages: [{ role: 'user', content: messages }]
      },
      parameters: {
        max_tokens: 4096,
        enable_thinking: true
      }
    };

    return await this._makeRequest(payload, 'multimodal');
  }

  /**
   * Get token usage statistics and cost analysis
   */
  getTokenStats() {
    return {
      usage: this.usageStats,
      tokenPlan: this.tokenPlan,
      remaining_budget: {
        daily: this.tokenPlan.budget_limits.daily - this._getTodayUsage(),
        monthly: this.tokenPlan.budget_limits.monthly - this._getMonthUsage()
      }
    };
  }

  /**
   * Check if request is within budget limits
   */
  _checkBudget(estimatedTokens) {
    const modelConfig = this.tokenPlan.models[this.model] || this.tokenPlan.models['qwen-max'];
    const estimatedCost = (estimatedTokens / 1000) * modelConfig.cost_per_1k;
    
    if (estimatedCost > this.tokenPlan.budget_limits.per_request) {
      throw new Error(`Estimated cost $${estimatedCost.toFixed(2)} exceeds per-request limit`);
    }
    
    const todayUsage = this._getTodayUsage();
    if (todayUsage + estimatedCost > this.tokenPlan.budget_limits.daily) {
      throw new Error(`Daily budget limit of $${this.tokenPlan.budget_limits.daily} would be exceeded`);
    }
    
    return { estimatedCost, withinBudget: true };
  }

  /**
   * Make API request to Qwen
   */
  async _makeRequest(payload, capability) {
    const startTime = Date.now();
    
    try {
      // Budget check
      const estimatedTokens = payload.parameters?.max_tokens || 2048;
      this._checkBudget(estimatedTokens);

      const response = await axios.post(
        `${this.baseUrl}/services/aigc/text-generation/generation`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: this.timeout
        }
      );

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Update usage stats
      const usedTokens = response.data.usage?.total_tokens || estimatedTokens;
      const modelConfig = this.tokenPlan.models[this.model] || this.tokenPlan.models['qwen-max'];
      const cost = (usedTokens / 1000) * modelConfig.cost_per_1k;
      
      this.usageStats.total_requests++;
      this.usageStats.total_tokens += usedTokens;
      this.usageStats.total_cost += cost;
      
      if (!this.usageStats.by_capability[capability]) {
        this.usageStats.by_capability[capability] = { requests: 0, tokens: 0, cost: 0 };
      }
      this.usageStats.by_capability[capability].requests++;
      this.usageStats.by_capability[capability].tokens += usedTokens;
      this.usageStats.by_capability[capability].cost += cost;
      
      this.tokenPlan.usage_tracking.push({
        timestamp: new Date().toISOString(),
        capability,
        tokens: usedTokens,
        cost,
        duration,
        model: this.model
      });

      return {
        success: true,
        data: response.data.output,
        usage: {
          tokens: usedTokens,
          cost,
          duration,
          model: this.model
        },
        capabilities_used: [capability]
      };

    } catch (error) {
      console.error(`[Qwen Agent] Error in ${capability}:`, error.message);
      throw error;
    }
  }

  /**
   * Extract key frames from video for analysis
   */
  async _extractKeyFrames(videoBuffer, mimeType) {
    // Placeholder: In production, use fluent-ffmpeg to extract frames
    // For now, return a single frame representation
    console.log('[Qwen Agent] Extracting key frames from video...');
    return [];
  }

  /**
   * Get MIME type from file extension
   */
  _getMimeType(filepath) {
    const ext = path.extname(filepath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.mp4': 'video/mp4',
      '.avi': 'video/avi',
      '.mov': 'video/quicktime',
      '.webm': 'video/webm'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Get today's usage cost
   */
  _getTodayUsage() {
    const today = new Date().toDateString();
    return this.tokenPlan.usage_tracking
      .filter(record => new Date(record.timestamp).toDateString() === today)
      .reduce((sum, record) => sum + record.cost, 0);
  }

  /**
   * Get month's usage cost
   */
  _getMonthUsage() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return this.tokenPlan.usage_tracking
      .filter(record => {
        const date = new Date(record.timestamp);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      })
      .reduce((sum, record) => sum + record.cost, 0);
  }
}

module.exports = QwenAIAgent;
