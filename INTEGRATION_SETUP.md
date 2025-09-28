# Integration Setup Guide

This guide will help you set up Supabase, Notion, and Google Drive integrations for your workspace application.

## Prerequisites

1. Node.js and npm installed
2. A Supabase account
3. A Notion account
4. A Google Cloud Platform account

## 1. Supabase Setup

### Step 1: Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization and enter project details
4. Wait for the project to be created

### Step 2: Get Your Supabase Credentials
1. Go to your project dashboard
2. Navigate to Settings > API
3. Copy the following:
   - Project URL
   - `anon` public key
   - `service_role` secret key

### Step 3: Set Up Database Schema
1. Go to the SQL Editor in your Supabase dashboard
2. Copy and paste the contents of `migrations/supabase-schema.sql`
3. Run the SQL script to create all tables and policies

### Step 4: Update Environment Variables
Add these to your `.env` file:
```
SUPABASE_URL=your_project_url_here
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## 2. Notion Setup

### Step 1: Create a Notion Integration
1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Give it a name (e.g., "Workspace Integration")
4. Select the workspace you want to use
5. Copy the "Internal Integration Token"

### Step 2: Create a Database
1. In Notion, create a new page
2. Add a database to the page
3. Add the following properties to your database:
   - **Title** (Title)
   - **Company** (Title)
   - **Memo Type** (Select)
   - **Title** (Rich Text)
   - **Created Date** (Date)
   - **Status** (Select)
   - **Novel** (Rich Text)
   - **POV Character** (Select)
   - **Beat Type** (Select)
   - **Chapter** (Rich Text)

### Step 3: Share Database with Integration
1. Click the "Share" button on your database
2. Click "Add people, emails, groups, or integrations"
3. Search for your integration name and add it
4. Copy the database ID from the URL (the long string after the last slash)

### Step 4: Update Environment Variables
Add these to your `.env` file:
```
NOTION_API_KEY=your_integration_token_here
NOTION_DATABASE_ID=your_database_id_here
```

## 3. Google Drive Setup

### Step 1: Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Google Drive API

### Step 2: Create OAuth 2.0 Credentials
1. Go to APIs & Services > Credentials
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Add authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback`
   - `http://localhost:3000` (for development)
5. Download the credentials JSON file

### Step 3: Get Refresh Token (Optional)
For automatic authentication, you can get a refresh token:
1. Use the OAuth 2.0 Playground: [developers.google.com/oauthplayground](https://developers.google.com/oauthplayground)
2. Select Google Drive API v3
3. Authorize and get your refresh token

### Step 4: Update Environment Variables
Add these to your `.env` file:
```
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
GOOGLE_REFRESH_TOKEN=your_refresh_token_here
```

## 4. Install Dependencies

Run the following command to install all required packages:

```bash
npm install
```

## 5. Run Migration (Optional)

If you have existing data in SQLite, you can migrate it to Supabase:

```bash
node migrations/migrate-to-supabase.js
```

## 6. Start the Application

```bash
npm start
```

## 7. Test Integrations

1. Open your browser and go to `http://localhost:3000`
2. Click on the "Integrations" tab
3. Check the status of all integrations
4. Test creating a credit memo or novel with integration options enabled

## Troubleshooting

### Supabase Issues
- Make sure your project URL and keys are correct
- Check that the database schema was created properly
- Verify RLS policies are set up correctly

### Notion Issues
- Ensure your integration token is valid
- Check that the database ID is correct
- Verify the integration has access to the database

### Google Drive Issues
- Make sure OAuth credentials are set up correctly
- Check that the redirect URI matches exactly
- Verify the Google Drive API is enabled

### General Issues
- Check that all environment variables are set correctly
- Look at the browser console and server logs for error messages
- Ensure all required packages are installed

## Features

### Supabase Integration
- Cloud database storage
- Real-time updates
- File storage for documents
- Row-level security

### Notion Integration
- Automatic page creation for credit memos
- Novel project tracking
- Chapter and story beat organization
- Rich text formatting

### Google Drive Integration
- Automatic file uploads
- Organized folder structure
- Document management
- Easy sharing and collaboration

## Security Notes

- Keep your `.env` file secure and never commit it to version control
- Use environment-specific credentials for production
- Regularly rotate your API keys
- Review and update RLS policies as needed

## Support

If you encounter any issues:
1. Check the console logs for error messages
2. Verify your environment variables
3. Test each integration individually
4. Refer to the official documentation for each service