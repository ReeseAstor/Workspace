const { Client } = require('@notionhq/client');
require('dotenv').config();

class NotionService {
    constructor() {
        this.notion = null;
        this.initializeClient();
    }

    initializeClient() {
        if (!process.env.NOTION_API_KEY) {
            console.log('Notion API key not configured. Skipping Notion initialization.');
            return;
        }

        try {
            this.notion = new Client({
                auth: process.env.NOTION_API_KEY,
            });
            console.log('Notion client initialized successfully');
        } catch (error) {
            console.error('Error initializing Notion client:', error);
        }
    }

    // Create a credit memo page in Notion
    async createCreditMemoPage(memoData) {
        if (!this.notion || !process.env.NOTION_DATABASE_ID_CREDIT) return null;

        try {
            const response = await this.notion.pages.create({
                parent: { database_id: process.env.NOTION_DATABASE_ID_CREDIT },
                properties: {
                    'Title': {
                        title: [
                            {
                                text: {
                                    content: memoData.title || 'Untitled Memo'
                                }
                            }
                        ]
                    },
                    'Company': {
                        rich_text: [
                            {
                                text: {
                                    content: memoData.company_name || ''
                                }
                            }
                        ]
                    },
                    'Memo Type': {
                        select: {
                            name: memoData.memo_type || 'General'
                        }
                    },
                    'Industry': {
                        rich_text: [
                            {
                                text: {
                                    content: memoData.industry || ''
                                }
                            }
                        ]
                    },
                    'Date': {
                        date: {
                            start: new Date().toISOString().split('T')[0]
                        }
                    }
                },
                children: [
                    {
                        object: 'block',
                        type: 'heading_1',
                        heading_1: {
                            rich_text: [
                                {
                                    type: 'text',
                                    text: {
                                        content: 'Credit Analysis Memo'
                                    }
                                }
                            ]
                        }
                    },
                    {
                        object: 'block',
                        type: 'paragraph',
                        paragraph: {
                            rich_text: [
                                {
                                    type: 'text',
                                    text: {
                                        content: memoData.content || ''
                                    }
                                }
                            ]
                        }
                    },
                    {
                        object: 'block',
                        type: 'heading_2',
                        heading_2: {
                            rich_text: [
                                {
                                    type: 'text',
                                    text: {
                                        content: 'Financial Metrics'
                                    }
                                }
                            ]
                        }
                    },
                    {
                        object: 'block',
                        type: 'code',
                        code: {
                            rich_text: [
                                {
                                    type: 'text',
                                    text: {
                                        content: JSON.stringify(memoData.financial_metrics || {}, null, 2)
                                    }
                                }
                            ],
                            language: 'json'
                        }
                    }
                ]
            });

            return response.id;
        } catch (error) {
            console.error('Error creating Notion credit memo page:', error);
            return null;
        }
    }

    // Create a novel project page in Notion
    async createNovelPage(novelData) {
        if (!this.notion || !process.env.NOTION_DATABASE_ID_NOVELS) return null;

        try {
            const response = await this.notion.pages.create({
                parent: { database_id: process.env.NOTION_DATABASE_ID_NOVELS },
                properties: {
                    'Title': {
                        title: [
                            {
                                text: {
                                    content: novelData.title || 'Untitled Novel'
                                }
                            }
                        ]
                    },
                    'POV Style': {
                        select: {
                            name: novelData.pov_style || 'dual_alternating'
                        }
                    },
                    'Tense': {
                        select: {
                            name: novelData.tense || 'past'
                        }
                    },
                    'Target Chapters': {
                        number: novelData.target_chapters || 25
                    },
                    'Target Beats': {
                        number: novelData.target_beats || 250
                    },
                    'Status': {
                        select: {
                            name: 'Planning'
                        }
                    }
                },
                children: [
                    {
                        object: 'block',
                        type: 'heading_1',
                        heading_1: {
                            rich_text: [
                                {
                                    type: 'text',
                                    text: {
                                        content: novelData.title || 'Novel Project'
                                    }
                                }
                            ]
                        }
                    },
                    {
                        object: 'block',
                        type: 'paragraph',
                        paragraph: {
                            rich_text: [
                                {
                                    type: 'text',
                                    text: {
                                        content: novelData.description || ''
                                    }
                                }
                            ]
                        }
                    },
                    {
                        object: 'block',
                        type: 'divider',
                        divider: {}
                    },
                    {
                        object: 'block',
                        type: 'heading_2',
                        heading_2: {
                            rich_text: [
                                {
                                    type: 'text',
                                    text: {
                                        content: 'Chapter Outline'
                                    }
                                }
                            ]
                        }
                    },
                    {
                        object: 'block',
                        type: 'to_do',
                        to_do: {
                            rich_text: [
                                {
                                    type: 'text',
                                    text: {
                                        content: 'Create chapter structure'
                                    }
                                }
                            ],
                            checked: false
                        }
                    }
                ]
            });

            return response.id;
        } catch (error) {
            console.error('Error creating Notion novel page:', error);
            return null;
        }
    }

    // Update a chapter in Notion
    async updateChapterInNotion(pageId, chapterData) {
        if (!this.notion || !pageId) return null;

        try {
            // Append chapter information to the novel page
            await this.notion.blocks.children.append({
                block_id: pageId,
                children: [
                    {
                        object: 'block',
                        type: 'heading_3',
                        heading_3: {
                            rich_text: [
                                {
                                    type: 'text',
                                    text: {
                                        content: `Chapter ${chapterData.chapter_number}: ${chapterData.title}`
                                    }
                                }
                            ]
                        }
                    },
                    {
                        object: 'block',
                        type: 'paragraph',
                        paragraph: {
                            rich_text: [
                                {
                                    type: 'text',
                                    text: {
                                        content: `POV: ${chapterData.pov_character}`
                                    }
                                }
                            ]
                        }
                    },
                    {
                        object: 'block',
                        type: 'quote',
                        quote: {
                            rich_text: [
                                {
                                    type: 'text',
                                    text: {
                                        content: chapterData.summary || 'No summary provided'
                                    }
                                }
                            ]
                        }
                    }
                ]
            });

            return true;
        } catch (error) {
            console.error('Error updating chapter in Notion:', error);
            return false;
        }
    }

    // Add story beat to Notion
    async addStoryBeatToNotion(pageId, beatData) {
        if (!this.notion || !pageId) return null;

        try {
            await this.notion.blocks.children.append({
                block_id: pageId,
                children: [
                    {
                        object: 'block',
                        type: 'bulleted_list_item',
                        bulleted_list_item: {
                            rich_text: [
                                {
                                    type: 'text',
                                    text: {
                                        content: `Beat ${beatData.beat_number} (${beatData.beat_type}): ${beatData.description}`,
                                        annotations: {
                                            bold: beatData.beat_type === 'climax'
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ]
            });

            return true;
        } catch (error) {
            console.error('Error adding story beat to Notion:', error);
            return false;
        }
    }

    // Search for pages in Notion
    async searchPages(query) {
        if (!this.notion) return [];

        try {
            const response = await this.notion.search({
                query: query,
                filter: {
                    property: 'object',
                    value: 'page'
                }
            });

            return response.results;
        } catch (error) {
            console.error('Error searching Notion pages:', error);
            return [];
        }
    }

    // Get database schema
    async getDatabaseSchema(databaseId) {
        if (!this.notion) return null;

        try {
            const response = await this.notion.databases.retrieve({
                database_id: databaseId
            });

            return response;
        } catch (error) {
            console.error('Error getting database schema:', error);
            return null;
        }
    }

    // Sync all credit memos to Notion
    async syncCreditMemosToNotion(memos) {
        if (!this.notion) return;

        const results = [];
        for (const memo of memos) {
            if (!memo.notion_page_id) {
                const pageId = await this.createCreditMemoPage(memo);
                results.push({ memoId: memo.id, notionPageId: pageId });
            }
        }

        return results;
    }

    // Sync all novels to Notion
    async syncNovelsToNotion(novels) {
        if (!this.notion) return;

        const results = [];
        for (const novel of novels) {
            if (!novel.notion_page_id) {
                const pageId = await this.createNovelPage(novel);
                results.push({ novelId: novel.id, notionPageId: pageId });
            }
        }

        return results;
    }
}

module.exports = new NotionService();