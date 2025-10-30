// Load environment variables and provide typed accessors
require('dotenv').config();

function toBool(value, defaultValue = false) {
	if (value === undefined || value === null || value === '') return defaultValue;
	return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

const config = {
	// Feature flags
	enableSupabase: toBool(process.env.ENABLE_SUPABASE, false),
	enableNotion: toBool(process.env.ENABLE_NOTION, false),
	enableGoogleDrive: toBool(process.env.ENABLE_GOOGLE_DRIVE, false),

	// Server
	port: parseInt(process.env.PORT || '3000', 10),

	// Supabase
	supabaseUrl: process.env.SUPABASE_URL,
	supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
	supabaseBucket: process.env.SUPABASE_BUCKET || 'financial-docs',
	supabasePublicFiles: toBool(process.env.SUPABASE_PUBLIC_FILES, true),

	// Notion
	notionToken: process.env.NOTION_TOKEN,
	notionDatabaseId: process.env.NOTION_DATABASE_ID,

	// Google Drive
	googleCredentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
	googleDriveFolderId: process.env.GDRIVE_FOLDER_ID,
	googleDriveMakePublic: toBool(process.env.GDRIVE_MAKE_PUBLIC, false)
};

module.exports = config;

