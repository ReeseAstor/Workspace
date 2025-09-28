const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

async function setup() {
    console.log('\n=================================');
    console.log('Workspace Integration Setup');
    console.log('=================================\n');

    const config = {};

    // Supabase Configuration
    console.log('--- Supabase Configuration ---');
    const setupSupabase = await question('Do you want to set up Supabase? (y/n): ');
    if (setupSupabase.toLowerCase() === 'y') {
        config.SUPABASE_URL = await question('Enter your Supabase project URL: ');
        config.SUPABASE_ANON_KEY = await question('Enter your Supabase anon key: ');
        config.SUPABASE_SERVICE_KEY = await question('Enter your Supabase service key (optional): ');
    }

    // Notion Configuration
    console.log('\n--- Notion Configuration ---');
    const setupNotion = await question('Do you want to set up Notion? (y/n): ');
    if (setupNotion.toLowerCase() === 'y') {
        config.NOTION_API_KEY = await question('Enter your Notion integration token: ');
        config.NOTION_DATABASE_ID_CREDIT = await question('Enter Notion database ID for credit memos: ');
        config.NOTION_DATABASE_ID_NOVELS = await question('Enter Notion database ID for novels: ');
    }

    // Google Drive Configuration
    console.log('\n--- Google Drive Configuration ---');
    const setupGoogle = await question('Do you want to set up Google Drive? (y/n): ');
    if (setupGoogle.toLowerCase() === 'y') {
        config.GOOGLE_CLIENT_ID = await question('Enter your Google Client ID: ');
        config.GOOGLE_CLIENT_SECRET = await question('Enter your Google Client Secret: ');
        config.GOOGLE_REDIRECT_URI = await question('Enter redirect URI (default: http://localhost:3000/auth/google/callback): ') || 'http://localhost:3000/auth/google/callback';
        config.GOOGLE_DRIVE_FOLDER_ID = await question('Enter Google Drive folder ID (optional): ');
    }

    // JWT and Server Configuration
    console.log('\n--- Server Configuration ---');
    config.JWT_SECRET = await question('Enter a JWT secret key (press enter to generate): ') || generateSecret();
    config.PORT = await question('Enter server port (default: 3000): ') || '3000';
    config.NODE_ENV = 'development';

    // Write .env file
    const envContent = Object.entries(config)
        .filter(([key, value]) => value)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    fs.writeFileSync(path.join(__dirname, '.env'), envContent);

    console.log('\n✅ Configuration saved to .env file');
    console.log('\nNext steps:');
    console.log('1. For Supabase: Create the required tables in your Supabase dashboard');
    console.log('2. For Notion: Create databases with the appropriate properties');
    console.log('3. For Google Drive: Enable Drive API in Google Cloud Console');
    console.log('\nRun "npm start" to launch the application\n');

    rl.close();
}

function generateSecret() {
    return require('crypto').randomBytes(32).toString('hex');
}

setup().catch(console.error);