const { Client } = require('@notionhq/client');
require('dotenv').config();

const notion = new Client({
    auth: process.env.NOTION_TOKEN,
});

const databases = {
    companies: process.env.NOTION_DATABASE_COMPANIES,
    novels: process.env.NOTION_DATABASE_NOVELS,
    creditMemos: process.env.NOTION_DATABASE_CREDIT_MEMOS
};

// Helper functions for Notion integration
const notionHelpers = {
    // Create a company page in Notion
    async createCompany(name, industry) {
        try {
            const response = await notion.pages.create({
                parent: { database_id: databases.companies },
                properties: {
                    'Name': {
                        title: [
                            {
                                text: {
                                    content: name,
                                },
                            },
                        ],
                    },
                    'Industry': {
                        rich_text: [
                            {
                                text: {
                                    content: industry || '',
                                },
                            },
                        ],
                    },
                    'Status': {
                        select: {
                            name: 'Active'
                        }
                    }
                },
            });
            return response;
        } catch (error) {
            console.error('Error creating company in Notion:', error);
            throw error;
        }
    },

    // Create a novel project page in Notion
    async createNovel(title, description, povStyle, tense, targetChapters, targetBeats) {
        try {
            const response = await notion.pages.create({
                parent: { database_id: databases.novels },
                properties: {
                    'Title': {
                        title: [
                            {
                                text: {
                                    content: title,
                                },
                            },
                        ],
                    },
                    'Description': {
                        rich_text: [
                            {
                                text: {
                                    content: description || '',
                                },
                            },
                        ],
                    },
                    'POV Style': {
                        select: {
                            name: povStyle
                        }
                    },
                    'Tense': {
                        select: {
                            name: tense
                        }
                    },
                    'Target Chapters': {
                        number: targetChapters
                    },
                    'Target Beats': {
                        number: targetBeats
                    },
                    'Status': {
                        select: {
                            name: 'Planning'
                        }
                    }
                },
            });
            return response;
        } catch (error) {
            console.error('Error creating novel in Notion:', error);
            throw error;
        }
    },

    // Create a credit memo page in Notion
    async createCreditMemo(companyName, memoType, title, content, financialMetrics) {
        try {
            const response = await notion.pages.create({
                parent: { database_id: databases.creditMemos },
                properties: {
                    'Title': {
                        title: [
                            {
                                text: {
                                    content: title,
                                },
                            },
                        ],
                    },
                    'Company': {
                        rich_text: [
                            {
                                text: {
                                    content: companyName,
                                },
                            },
                        ],
                    },
                    'Memo Type': {
                        select: {
                            name: memoType
                        }
                    },
                    'Content': {
                        rich_text: [
                            {
                                text: {
                                    content: content.substring(0, 2000), // Notion has limits
                                },
                            },
                        ],
                    },
                    'Status': {
                        select: {
                            name: 'Draft'
                        }
                    }
                },
            });
            return response;
        } catch (error) {
            console.error('Error creating credit memo in Notion:', error);
            throw error;
        }
    },

    // Sync data from Supabase to Notion
    async syncToNotion(type, data) {
        switch (type) {
            case 'company':
                return await this.createCompany(data.name, data.industry);
            case 'novel':
                return await this.createNovel(
                    data.title, 
                    data.description, 
                    data.pov_style, 
                    data.tense, 
                    data.target_chapters, 
                    data.target_beats
                );
            case 'credit_memo':
                return await this.createCreditMemo(
                    data.company_name,
                    data.memo_type,
                    data.title,
                    data.content,
                    data.financial_metrics
                );
            default:
                throw new Error(`Unknown sync type: ${type}`);
        }
    }
};

module.exports = {
    notion,
    databases,
    notionHelpers
};