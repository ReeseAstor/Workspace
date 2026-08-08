/**
 * Content Pipeline Agent for 88Away LLC
 * AI-Powered KDP Content Creation: Writing, Covers, Formatting
 * Uses Qwen-Max for content generation and Wanx for visual creation
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

class ContentPipelineAgent {
  constructor(config) {
    this.config = config;
    this.dashScopeApiKey = process.env.DASHSCOPE_API_KEY;
    this.baseUrl = 'https://dashscope.aliyuncs.com/api/v1';
    
    // Content templates by type
    this.contentTemplates = {
      'low-content': {
        pages: 100-150,
        structure: ['cover', 'intro', 'daily_pages', 'back_matter'],
        aiAssistLevel: 'minimal'
      },
      'medium-content': {
        pages: 50-100,
        structure: ['cover', 'intro', 'chapters', 'exercises', 'resources'],
        aiAssistLevel: 'moderate'
      },
      'specialized-guide': {
        pages: 150-300,
        structure: ['cover', 'toc', 'intro', 'chapters', 'case_studies', 'appendix'],
        aiAssistLevel: 'extensive'
      }
    };
  }

  /**
   * Generate complete manuscript for a book
   * @param {Object} bookSpec - Book specifications
   * @returns {Promise<Object>} - Generated manuscript
   */
  async generateManuscript(bookSpec) {
    const { title, subtitle, niche, contentType, targetAudience, outline } = bookSpec;
    
    const template = this.contentTemplates[contentType] || this.contentTemplates['medium-content'];
    
    const prompt = `
      Write a complete manuscript for a KDP book with these specifications:
      
      Title: ${title}
      Subtitle: ${subtitle || ''}
      Niche: ${niche}
      Content Type: ${contentType}
      Target Audience: ${targetAudience}
      Expected Pages: ${template.pages}
      
      Outline:
      ${outline ? JSON.stringify(outline, null, 2) : 'Create optimal structure based on niche'}
      
      Requirements:
      - Engaging introduction that hooks readers
      - Well-structured chapters with clear headings
      - Actionable content appropriate for ${contentType}
      - Professional tone suitable for ${targetAudience}
      - Include call-to-actions where appropriate
      - Format in Markdown with clear chapter breaks
      
      Generate the FULL manuscript content.
    `;

    try {
      const response = await this.callQwenMax(prompt, 8000);
      
      return {
        bookSpec,
        manuscript: response.content,
        wordCount: this.countWords(response.content),
        estimatedPages: Math.ceil(this.countWords(response.content) / 250),
        contentType,
        timestamp: new Date().toISOString(),
        requestId: uuidv4()
      };
    } catch (error) {
      console.error(`Error generating manuscript:`, error.message);
      throw error;
    }
  }

  /**
   * Generate workbook exercises and activities
   * @param {string} topic - Topic for exercises
   * @param {number} count - Number of exercises to generate
   * @returns {Promise<Object>} - Generated exercises
   */
  async generateWorkbookExercises(topic, count = 20) {
    const prompt = `
      Create ${count} engaging workbook exercises for: "${topic}"
      
      For each exercise include:
      1. Exercise title
      2. Learning objective
      3. Instructions (clear and actionable)
      4. Space for responses (indicate with [_____________])
      5. Example or sample answer (where applicable)
      6. Difficulty level (Beginner/Intermediate/Advanced)
      
      Vary exercise types: reflection questions, fill-in-blanks, 
      checklists, goal-setting templates, action plans, self-assessments.
      
      Format as JSON array.
    `;

    try {
      const response = await this.callQwenMax(prompt);
      
      return {
        topic,
        exercises: response.exercises || [],
        count: response.exercises?.length || 0,
        timestamp: new Date().toISOString(),
        requestId: uuidv4()
      };
    } catch (error) {
      console.error(`Error generating exercises:`, error.message);
      throw error;
    }
  }

  /**
   * Generate book cover design prompt for AI image generation
   * @param {Object} bookSpec - Book specifications
   * @returns {Promise<Object>} - Cover design prompt and metadata
   */
  async generateCoverDesignPrompt(bookSpec) {
    const { title, subtitle, niche, contentType, targetAudience } = bookSpec;
    
    const prompt = `
      Create a detailed AI image generation prompt for a KDP book cover:
      
      Book Details:
      - Title: ${title}
      - Subtitle: ${subtitle || ''}
      - Niche: ${niche}
      - Type: ${contentType}
      - Audience: ${targetAudience}
      
      Generate:
      1. Visual concept description (detailed scene/imagery)
      2. Color palette recommendations (hex codes)
      3. Typography style suggestions
      4. Mood and atmosphere keywords
      5. Composition guidelines (rule of thirds, focal points)
      6. Genre-specific design elements
      
      Also provide the exact prompt optimized for Wanx/Midjourney.
      Format as JSON.
    `;

    try {
      const response = await this.callQwenMax(prompt);
      
      return {
        bookSpec,
        designConcept: response,
        aiPrompt: response.aiPrompt || response.prompt,
        colorPalette: response.colorPalette,
        typographyStyle: response.typography,
        timestamp: new Date().toISOString(),
        requestId: uuidv4()
      };
    } catch (error) {
      console.error(`Error generating cover design:`, error.message);
      throw error;
    }
  }

  /**
   * Generate actual cover image using Wanx
   * @param {string} prompt - Image generation prompt
   * @param {string} outputPath - File path to save image
   * @returns {Promise<Object>} - Generated image details
   */
  async generateCoverImage(prompt, outputPath) {
    const payload = {
      model: 'wanx-v1',
      input: {
        prompt: prompt
      },
      parameters: {
        style: '<auto>',
        size: '1024*1024',
        n: 1,
        seed: Math.floor(Math.random() * 10000)
      }
    };

    try {
      // Initiate generation
      const initResponse = await axios.post(
        `${this.baseUrl}/services/aigc/text2image/image-synthesis`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.dashScopeApiKey}`,
            'Content-Type': 'application/json',
            'X-DashScope-Async': 'enable'
          }
        }
      );

      const taskId = initResponse.data.output.task_id;
      
      // Poll for completion
      let imageUrl = null;
      let attempts = 0;
      while (attempts < 30) {
        await this.sleep(2000);
        
        const statusResponse = await axios.get(
          `${this.baseUrl}/tasks/${taskId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.dashScopeApiKey}`
            }
          }
        );

        if (statusResponse.data.output.task_status === 'SUCCEEDED') {
          imageUrl = statusResponse.data.output.results[0].url;
          break;
        } else if (statusResponse.data.output.task_status === 'FAILED') {
          throw new Error('Image generation failed');
        }
        
        attempts++;
      }

      if (!imageUrl) {
        throw new Error('Image generation timeout');
      }

      // Download and save image
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      await fs.writeFile(outputPath, imageResponse.data);

      return {
        prompt,
        imagePath: outputPath,
        imageUrl,
        taskId,
        timestamp: new Date().toISOString(),
        requestId: uuidv4()
      };
    } catch (error) {
      console.error(`Error generating cover image:`, error.message);
      throw error;
    }
  }

  /**
   * Generate book description for Amazon listing
   * @param {Object} bookSpec - Book specifications
   * @returns {Promise<Object>} - Optimized book description
   */
  async generateBookDescription(bookSpec) {
    const { title, subtitle, niche, contentType, targetAudience, keyBenefits } = bookSpec;
    
    const prompt = `
      Write a compelling Amazon KDP book description for:
      
      Title: ${title}
      Subtitle: ${subtitle || ''}
      Niche: ${niche}
      Type: ${contentType}
      Target Audience: ${targetAudience}
      Key Benefits: ${keyBenefits?.join(', ') || 'To be determined based on content'}
      
      Requirements:
      - Hook opening paragraph that grabs attention
      - Bullet points highlighting key benefits
      - Emotional triggers appropriate for ${targetAudience}
      - SEO-optimized with relevant keywords
      - Clear call-to-action
      - HTML formatting tags (<b>, <ul>, <li>) for Amazon
      - Keep under 2000 characters
      
      Provide both HTML version and plain text version.
      Format as JSON.
    `;

    try {
      const response = await this.callQwenMax(prompt);
      
      return {
        bookSpec,
        descriptionHtml: response.html || response.descriptionHtml,
        descriptionPlain: response.plain || response.descriptionPlain,
        keywords: response.keywords,
        characterCount: (response.html || '').length,
        timestamp: new Date().toISOString(),
        requestId: uuidv4()
      };
    } catch (error) {
      console.error(`Error generating book description:`, error.message);
      throw error;
    }
  }

  /**
   * Generate 7 backend keywords for KDP
   * @param {string} niche - Book niche
   * @param {Array} existingKeywords - Already used keywords
   * @returns {Promise<Object>} - Optimized backend keywords
   */
  async generateBackendKeywords(niche, existingKeywords = []) {
    const prompt = `
      Generate 7 optimized backend search terms for KDP book in niche: "${niche}"
      Existing keywords to avoid: ${existingKeywords.join(', ') || 'None'}
      
      Requirements:
      - Each phrase max 50 bytes (Amazon limit)
      - No repetition of words across phrases
      - Mix of short-tail and long-tail keywords
      - Include buyer intent keywords
      - Avoid brand names and ASINs
      - Optimize for search volume vs competition
      
      Return as JSON array of exactly 7 strings.
    `;

    try {
      const response = await this.callQwenMax(prompt);
      const keywords = response.keywords || response;
      
      return {
        niche,
        keywords: Array.isArray(keywords) ? keywords.slice(0, 7) : [],
        byteCounts: (Array.isArray(keywords) ? keywords : []).map(k => `${k}: ${Buffer.byteLength(k, 'utf8')} bytes`),
        timestamp: new Date().toISOString(),
        requestId: uuidv4()
      };
    } catch (error) {
      console.error(`Error generating backend keywords:`, error.message);
      throw error;
    }
  }

  /**
   * Quality control check for AI-generated content
   * @param {string} content - Content to review
   * @param {string} contentType - Type of content
   * @returns {Promise<Object>} - QC report
   */
  async performQualityCheck(content, contentType) {
    const prompt = `
      Perform quality control review on ${contentType} content.
      
      Evaluate:
      1. Originality score (0-100)
      2. Readability grade level
      3. Consistency of tone and style
      4. Factual accuracy flags
      5. Grammar and spelling issues count
      6. Engagement quality (0-10)
      7. KDP compliance risks
      8. Plagiarism risk indicators
      9. Overall quality score (0-10)
      
      Provide specific recommendations for improvement.
      Flag any content that violates KDP Terms of Service.
      
      Format as JSON.
    `;

    try {
      const response = await this.callQwenMax(prompt, 3000);
      
      return {
        contentType,
        contentLength: content.length,
        qcReport: response,
        passed: (response.overallScore || 0) >= 7 && !response.kdpComplianceRisks?.length,
        timestamp: new Date().toISOString(),
        requestId: uuidv4()
      };
    } catch (error) {
      console.error(`Error performing quality check:`, error.message);
      throw error;
    }
  }

  /**
   * Format manuscript for Atticus/Vellum export
   * @param {string} manuscript - Raw manuscript content
   * @param {string} format - Output format (docx, epub, pdf-ready)
   * @returns {Promise<Object>} - Formatted content
   */
  async formatForPublishing(manuscript, format = 'docx') {
    // Basic formatting - in production would integrate with Atticus/Vellum API
    const formatted = manuscript
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')  // H1 headers
      .replace(/^## (.*$)/gim, '<h2>$1</h2>') // H2 headers
      .replace(/^\*\*(.*)\*\*/gim, '<strong>$1</strong>') // Bold
      .replace(/^\*(.*)\*/gim, '<em>$1</em>'); // Italic

    return {
      originalLength: manuscript.length,
      formattedLength: formatted.length,
      format,
      content: formatted,
      readyForExport: true,
      timestamp: new Date().toISOString(),
      requestId: uuidv4()
    };
  }

  /**
   * Call Qwen-Max for content generation
   */
  async callQwenMax(prompt, maxTokens = 4000) {
    const payload = {
      model: 'qwen-max',
      input: {
        messages: [
          {
            role: 'system',
            content: 'You are an expert KDP author and publishing professional. Create high-quality, original content optimized for Kindle Direct Publishing.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      parameters: {
        result_format: 'message',
        temperature: 0.8,
        max_tokens: maxTokens,
        top_p: 0.9
      }
    };

    const response = await axios.post(
      `${this.baseUrl}/services/aigc/text-generation/generation`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${this.dashScopeApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.output.choices[0].message.content;
    try {
      return JSON.parse(content);
    } catch {
      return { content, parsed: false };
    }
  }

  /**
   * Count words in text
   */
  countWords(text) {
    return text.trim().split(/\s+/).length;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Run complete content pipeline for a book
   */
  async runContentPipeline(bookSpec) {
    console.log(`📚 Starting content pipeline for: ${bookSpec.title}`);
    
    const results = {
      bookSpec,
      manuscript: null,
      exercises: null,
      coverDesign: null,
      coverImage: null,
      description: null,
      keywords: null,
      qcReport: null,
      formatted: null
    };

    try {
      // Step 1: Generate manuscript
      console.log('✍️ Generating manuscript...');
      results.manuscript = await this.generateManuscript(bookSpec);

      // Step 2: Generate exercises if workbook
      if (bookSpec.contentType === 'medium-content') {
        console.log('📝 Generating workbook exercises...');
        results.exercises = await this.generateWorkbookExercises(bookSpec.niche, 20);
      }

      // Step 3: Design cover
      console.log('🎨 Designing cover...');
      results.coverDesign = await this.generateCoverDesignPrompt(bookSpec);
      
      // Step 4: Generate cover image
      console.log('🖼️ Generating cover image...');
      const coverPath = path.join(process.cwd(), 'covers', `${bookSpec.title.replace(/[^a-z0-9]/gi, '_')}_cover.png`);
      results.coverImage = await this.generateCoverImage(results.coverDesign.aiPrompt, coverPath);

      // Step 5: Generate description
      console.log('📄 Generating book description...');
      results.description = await this.generateBookDescription(bookSpec);

      // Step 6: Generate keywords
      console.log('🔑 Generating keywords...');
      results.keywords = await this.generateBackendKeywords(bookSpec.niche);

      // Step 7: Quality check
      console.log('✅ Performing quality check...');
      results.qcReport = await this.performQualityCheck(
        results.manuscript.manuscript, 
        bookSpec.contentType
      );

      // Step 8: Format for publishing
      console.log('📑 Formatting for publishing...');
      results.formatted = await this.formatForPublishing(results.manuscript.manuscript);

      return results;
    } catch (error) {
      console.error('Content pipeline failed:', error.message);
      throw error;
    }
  }
}

module.exports = ContentPipelineAgent;
