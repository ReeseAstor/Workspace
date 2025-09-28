'use strict';

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const { Client: NotionClient } = require('@notionhq/client');
const { google } = require('googleapis');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseBucket = process.env.SUPABASE_BUCKET || 'financial-documents';

const notionToken = process.env.NOTION_TOKEN;
const notionDatabaseId = process.env.NOTION_DATABASE_ID;

const googleProjectId = process.env.GOOGLE_PROJECT_ID;
const googleClientEmail = process.env.GOOGLE_CLIENT_EMAIL;
let googlePrivateKey = process.env.GOOGLE_PRIVATE_KEY;
if (googlePrivateKey && googlePrivateKey.includes('\\n')) {
	googlePrivateKey = googlePrivateKey.replace(/\\n/g, '\n');
}
const googleDriveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

const supabaseKeyToUse = supabaseServiceKey || supabaseAnonKey;
const supabase = (supabaseUrl && supabaseKeyToUse) ? createClient(supabaseUrl, supabaseKeyToUse) : null;

const notion = notionToken ? new NotionClient({ auth: notionToken }) : null;

let drive = null;
if (googleClientEmail && googlePrivateKey) {
	const jwt = new google.auth.JWT({
		email: googleClientEmail,
		key: googlePrivateKey,
		scopes: ['https://www.googleapis.com/auth/drive.file'],
		subject: undefined,
	});
	drive = google.drive({ version: 'v3', auth: jwt });
}

const integrations = {
	supabase,
	supabaseBucket,
	notion,
	notionDatabaseId,
	drive,
	googleDriveFolderId,
	isSupabaseConfigured: Boolean(supabase),
	isNotionConfigured: Boolean(notion),
	isGoogleDriveConfigured: Boolean(drive),
};

async function uploadFileToSupabase(localFilePath, destinationPath, mimeType) {
	if (!supabase) {
		throw new Error('Supabase is not configured');
	}
	const fs = require('fs').promises;
	const buffer = await fs.readFile(localFilePath);
	const { data, error } = await supabase.storage.from(supabaseBucket).upload(destinationPath, buffer, {
		contentType: mimeType || 'application/octet-stream',
		upsert: true,
	});
	if (error) {
		throw error;
	}
	const { data: publicUrlData } = supabase.storage.from(supabaseBucket).getPublicUrl(destinationPath);
	return { path: data.path, publicUrl: publicUrlData.publicUrl };
}

async function uploadFileToGoogleDrive(localFilePath, destinationName, mimeType) {
	if (!drive) {
		throw new Error('Google Drive is not configured');
	}
	const fs = require('fs');
	const fileMetadata = {
		name: destinationName,
		parents: googleDriveFolderId ? [googleDriveFolderId] : undefined,
	};
	const media = {
		mimeType: mimeType || 'application/octet-stream',
		body: fs.createReadStream(localFilePath),
	};
	const res = await drive.files.create({
		requestBody: fileMetadata,
		media,
		fields: 'id, name, webViewLink, webContentLink',
	});
	const fileId = res.data.id;
	try {
		await drive.permissions.create({
			fileId,
			requestBody: { role: 'reader', type: 'anyone' },
		});
	} catch (e) {}
	const linkRes = await drive.files.get({
		fileId,
		fields: 'id, name, webViewLink, webContentLink',
	});
	return linkRes.data;
}

async function exportCreditMemoToNotion(memo) {
	if (!notion) {
		throw new Error('Notion is not configured');
	}
	if (!notionDatabaseId) {
		throw new Error('NOTION_DATABASE_ID is not set');
	}
	const page = await notion.pages.create({
		parent: { database_id: notionDatabaseId },
		properties: {
			Title: {
				title: [{ text: { content: memo.title || 'Credit Memo' } }],
			},
			MemoType: {
				rich_text: [{ text: { content: memo.memo_type || '' } }],
			},
			CompanyId: {
				number: Number(memo.company_id) || null,
			},
			CreatedAt: {
				date: { start: new Date().toISOString() },
			},
		},
		children: [
			{
				object: 'block',
				type: 'paragraph',
				paragraph: {
					rich_text: [{ type: 'text', text: { content: memo.content || '' } }],
				},
			},
			...(memo.financial_metrics
				? [
					{
						object: 'block',
						type: 'code',
						code: {
							language: 'json',
							rich_text: [{ type: 'text', text: { content: typeof memo.financial_metrics === 'string' ? memo.financial_metrics : JSON.stringify(memo.financial_metrics, null, 2) } }],
						},
					},
				]
				: []),
		],
	});
	return page;
}

module.exports = {
	integrations,
	uploadFileToSupabase,
	uploadFileToGoogleDrive,
	exportCreditMemoToNotion,
};