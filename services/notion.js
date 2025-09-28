const { Client } = require('@notionhq/client');
const config = require('../config/env');

function buildNotion() {
	if (!config.enableNotion) return null;
	if (!config.notionToken) return null;
	return new Client({ auth: config.notionToken });
}

async function getTitlePropertyName(notion, databaseId) {
	const db = await notion.databases.retrieve({ database_id: databaseId });
	for (const [propName, propDef] of Object.entries(db.properties)) {
		if (propDef.type === 'title') return propName;
	}
	return 'Name';
}

async function createCreditMemoPage({ title, content, memoType, companyName, metrics }) {
	const notion = buildNotion();
	if (!notion || !config.notionDatabaseId) {
		return { pageId: null };
	}
	const titleProp = await getTitlePropertyName(notion, config.notionDatabaseId);
	const children = [];
	if (companyName) {
		children.push({ object: 'block', heading_2: { rich_text: [{ text: { content: `Company: ${companyName}` } }] } });
	}
	if (memoType) {
		children.push({ object: 'block', paragraph: { rich_text: [{ text: { content: `Memo Type: ${memoType}` } }] } });
	}
	if (metrics && Object.keys(metrics || {}).length > 0) {
		children.push({ object: 'block', heading_3: { rich_text: [{ text: { content: 'Financial Metrics' } }] } });
		children.push({ object: 'block', code: { language: 'json', rich_text: [{ text: { content: JSON.stringify(metrics, null, 2) } }] } });
	}
	if (content) {
		children.push({ object: 'block', paragraph: { rich_text: [{ text: { content } }] } });
	}
	const page = await notion.pages.create({
		parent: { database_id: config.notionDatabaseId },
		properties: { [titleProp]: { title: [{ text: { content: title || 'Credit Memo' } }] } },
		children
	});
	return { pageId: page.id };
}

module.exports = { createCreditMemoPage };

