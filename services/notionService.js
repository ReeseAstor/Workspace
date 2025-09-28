const { Client } = require('@notionhq/client');
const { notionConfig } = require('../config/integrations');

class NotionService {
  constructor() {
    this.client = new Client({ auth: notionConfig.apiKey });
    this.databaseId = notionConfig.databaseId;
  }

  // Create a new page in Notion
  async createPage(pageData) {
    try {
      const response = await this.client.pages.create({
        parent: { database_id: this.databaseId },
        properties: pageData.properties,
        children: pageData.children || []
      });
      return response;
    } catch (error) {
      console.error('Notion API error:', error);
      throw error;
    }
  }

  // Create a credit memo page
  async createCreditMemoPage(memoData) {
    const pageData = {
      properties: {
        'Company': {
          title: [{ text: { content: memoData.company_name } }]
        },
        'Memo Type': {
          select: { name: memoData.memo_type }
        },
        'Title': {
          rich_text: [{ text: { content: memoData.title } }]
        },
        'Created Date': {
          date: { start: new Date().toISOString().split('T')[0] }
        },
        'Status': {
          select: { name: 'Draft' }
        }
      },
      children: [
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ text: { content: 'Financial Metrics' } }]
          }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ text: { content: memoData.financial_metrics || 'No metrics provided' } }]
          }
        },
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ text: { content: 'Content' } }]
          }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ text: { content: memoData.content } }]
          }
        }
      ]
    };

    return await this.createPage(pageData);
  }

  // Create a novel project page
  async createNovelPage(novelData) {
    const pageData = {
      properties: {
        'Title': {
          title: [{ text: { content: novelData.title } }]
        },
        'Description': {
          rich_text: [{ text: { content: novelData.description || 'No description' } }]
        },
        'POV Style': {
          select: { name: novelData.pov_style }
        },
        'Tense': {
          select: { name: novelData.tense }
        },
        'Target Chapters': {
          number: novelData.target_chapters
        },
        'Target Beats': {
          number: novelData.target_beats
        },
        'Status': {
          select: { name: 'Planning' }
        },
        'Created Date': {
          date: { start: new Date().toISOString().split('T')[0] }
        }
      },
      children: [
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ text: { content: 'Project Overview' } }]
          }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ text: { content: `This novel project is set up with ${novelData.pov_style} POV in ${novelData.tense} tense. Target: ${novelData.target_chapters} chapters and ${novelData.target_beats} story beats.` } }]
          }
        }
      ]
    };

    return await this.createPage(pageData);
  }

  // Create a chapter page
  async createChapterPage(chapterData, novelTitle) {
    const pageData = {
      properties: {
        'Chapter': {
          title: [{ text: { content: `Chapter ${chapterData.chapter_number}: ${chapterData.title}` } }]
        },
        'Novel': {
          rich_text: [{ text: { content: novelTitle } }]
        },
        'POV Character': {
          select: { name: chapterData.pov_character }
        },
        'Word Count': {
          number: chapterData.word_count || 0
        },
        'Status': {
          select: { name: 'Planned' }
        }
      },
      children: [
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ text: { content: 'Summary' } }]
          }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ text: { content: chapterData.summary || 'No summary provided' } }]
          }
        }
      ]
    };

    return await this.createPage(pageData);
  }

  // Create a story beat page
  async createStoryBeatPage(beatData, novelTitle, chapterTitle) {
    const pageData = {
      properties: {
        'Beat': {
          title: [{ text: { content: `Beat ${beatData.beat_number}: ${beatData.description}` } }]
        },
        'Novel': {
          rich_text: [{ text: { content: novelTitle } }]
        },
        'Chapter': {
          rich_text: [{ text: { content: chapterTitle || 'Not assigned' } }]
        },
        'Beat Type': {
          select: { name: beatData.beat_type }
        },
        'POV Character': {
          select: { name: beatData.pov_character }
        },
        'Status': {
          select: { name: 'Planned' }
        }
      },
      children: [
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ text: { content: 'Description' } }]
          }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ text: { content: beatData.description } }]
          }
        }
      ]
    };

    return await this.createPage(pageData);
  }

  // Get pages from database
  async getPages() {
    try {
      const response = await this.client.databases.query({
        database_id: this.databaseId
      });
      return response.results;
    } catch (error) {
      console.error('Notion API error:', error);
      throw error;
    }
  }

  // Update a page
  async updatePage(pageId, properties) {
    try {
      const response = await this.client.pages.update({
        page_id: pageId,
        properties: properties
      });
      return response;
    } catch (error) {
      console.error('Notion API error:', error);
      throw error;
    }
  }

  // Test connection
  async testConnection() {
    try {
      await this.client.users.me();
      console.log('Notion connected successfully');
      return true;
    } catch (error) {
      console.error('Notion connection error:', error);
      return false;
    }
  }
}

module.exports = new NotionService();