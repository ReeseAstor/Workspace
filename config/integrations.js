require('dotenv').config();

// Supabase Configuration
const supabaseConfig = {
  url: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
};

// Notion Configuration
const notionConfig = {
  apiKey: process.env.NOTION_API_KEY,
  databaseId: process.env.NOTION_DATABASE_ID
};

// Google Drive Configuration
const googleConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
  refreshToken: process.env.GOOGLE_REFRESH_TOKEN
};

// Validation function
function validateConfig() {
  const required = {
    supabase: ['url', 'anonKey'],
    notion: ['apiKey'],
    google: ['clientId', 'clientSecret']
  };

  const missing = [];
  
  Object.entries(required).forEach(([service, keys]) => {
    keys.forEach(key => {
      const config = service === 'supabase' ? supabaseConfig : 
                   service === 'notion' ? notionConfig : googleConfig;
      if (!config[key]) {
        missing.push(`${service}.${key}`);
      }
    });
  });

  if (missing.length > 0) {
    console.warn(`Missing configuration for: ${missing.join(', ')}`);
    console.warn('Some features may not work properly. Please check your .env file.');
  }

  return missing.length === 0;
}

module.exports = {
  supabaseConfig,
  notionConfig,
  googleConfig,
  validateConfig
};