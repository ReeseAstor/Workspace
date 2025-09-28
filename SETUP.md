# Workspace Setup Guide

This guide will help you set up the Credit Analysis & Novel Planning Workspace with cloud integrations.

## Prerequisites

- Node.js (version 14 or higher)
- npm or yarn
- Supabase account
- Notion account (optional)
- Google Cloud Platform account (optional)

## Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Copy the environment configuration:
```bash
cp .env.example .env
```

## Supabase Setup

1. **Create a Supabase Project**:
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and API keys

2. **Configure Environment Variables**:
   ```bash
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

3. **Set up Database Schema**:
   - Go to your Supabase dashboard
   - Navigate to the SQL Editor
   - Copy and paste the contents of `supabase/schema.sql`
   - Run the script to create all tables and policies

4. **Enable Authentication**:
   - In Supabase dashboard, go to Authentication > Settings
   - Configure your site URL (e.g., `http://localhost:3000`)
   - Enable email authentication

## Notion Integration (Optional)

1. **Create Notion Integration**:
   - Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
   - Create a new integration
   - Copy the integration token

2. **Create Notion Databases**:
   Create three databases in your Notion workspace:
   
   **Companies Database**:
   - Name (Title)
   - Industry (Text)
   - Status (Select: Active, Inactive)
   
   **Novels Database**:
   - Title (Title)
   - Description (Text)
   - POV Style (Select: dual_alternating, single, multiple)
   - Tense (Select: past, present)
   - Target Chapters (Number)
   - Target Beats (Number)
   - Status (Select: Planning, Writing, Editing, Complete)
   
   **Credit Memos Database**:
   - Title (Title)
   - Company (Text)
   - Memo Type (Select: annual_review, refinancing, new_deal, amendment)
   - Content (Text)
   - Status (Select: Draft, Review, Final)

3. **Share Databases with Integration**:
   - For each database, click "Share" and invite your integration

4. **Configure Environment Variables**:
   ```bash
   NOTION_TOKEN=your_notion_integration_token
   NOTION_DATABASE_COMPANIES=your_companies_database_id
   NOTION_DATABASE_NOVELS=your_novels_database_id
   NOTION_DATABASE_CREDIT_MEMOS=your_credit_memos_database_id
   ```

## Google Drive Integration (Optional)

1. **Create Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing one

2. **Enable Google Drive API**:
   - Go to APIs & Services > Library
   - Search for "Google Drive API" and enable it

3. **Create OAuth2 Credentials**:
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Application type: Web application
   - Add authorized redirect URI: `http://localhost:3000/auth/google/callback`

4. **Configure Environment Variables**:
   ```bash
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
   GOOGLE_DRIVE_FOLDER_ID=your_main_folder_id
   ```

5. **Create Main Folder** (Optional):
   - Create a folder in Google Drive for your workspace files
   - Get the folder ID from the URL and set it as `GOOGLE_DRIVE_FOLDER_ID`

## JWT Configuration

Set a secure JWT secret:
```bash
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
```

## Running the Application

1. Start the server:
```bash
npm start
```

2. Open your browser and navigate to `http://localhost:3000`

3. Create an account or sign in

4. Configure integrations in your profile settings

## Features

### Authentication
- User registration and login
- JWT-based session management
- Profile management

### Credit Analysis
- Company management with Notion sync
- Financial document upload with Google Drive backup
- Credit memo generation with external sync
- OCR processing simulation

### Novel Planning
- Novel project management
- Chapter organization
- Story beats tracking
- Manuscript backup to Google Drive

### Cloud Integrations
- **Supabase**: Primary database with real-time features
- **Notion**: Sync companies, novels, and credit memos
- **Google Drive**: Backup financial documents and manuscripts
- Sync status tracking and manual sync triggers

## Development

### Database Schema
The application uses Supabase PostgreSQL with Row Level Security (RLS) enabled. Key tables:
- `profiles`: User profiles and integration settings
- `companies`: Trading company information
- `financial_data`: Uploaded documents and OCR data
- `credit_memos`: Generated credit analysis memos
- `novels`: Novel project details
- `chapters`: Individual chapters with content
- `story_beats`: Detailed story beats
- `sync_logs`: Track sync operations with external services

### API Endpoints
- Authentication: `/auth/*`
- Companies: `/api/companies`
- Financial data: `/api/upload-financial`
- Credit memos: `/api/credit-memos`
- Novels: `/api/novels`
- Chapters: `/api/chapters`
- Story beats: `/api/beats`
- Sync operations: `/api/sync/*`

## Troubleshooting

### Common Issues

1. **Database Connection Error**:
   - Verify Supabase URL and keys
   - Check if schema is properly set up

2. **Authentication Issues**:
   - Ensure JWT secret is set
   - Verify Supabase auth settings

3. **Google Drive Upload Fails**:
   - Check OAuth credentials
   - Verify redirect URI matches exactly
   - Ensure user has connected Google Drive

4. **Notion Sync Fails**:
   - Verify integration token
   - Check database IDs
   - Ensure databases are shared with integration

### Logs
Check server logs for detailed error messages. All sync operations are logged to the `sync_logs` table.

## Security Notes

- Never commit `.env` file to version control
- Use strong JWT secrets in production
- Enable HTTPS in production
- Review Supabase RLS policies
- Limit Google OAuth scopes to minimum required

## Production Deployment

1. Set `NODE_ENV=production`
2. Use secure JWT secrets
3. Configure proper CORS settings
4. Set up SSL/TLS certificates
5. Update OAuth redirect URIs for production domain
6. Review and test all security policies