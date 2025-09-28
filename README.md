# Commodities Credit Analysis & Novel Planning Workspace

A comprehensive workspace application that combines credit analysis tools for commodities trading companies with novel planning and development features. The application integrates with Supabase for real-time database sync, Notion for documentation, and Google Drive for file storage.

## Features

### Credit Analysis
- **Company Management**: Track and manage commodities trading companies
- **Financial Document Processing**: Upload and process financial statements with OCR capabilities
- **Credit Memo Generation**: Create structured credit memos for various purposes (annual review, refinancing, new deals)
- **Financial Metrics Tracking**: Store and analyze key financial metrics

### Novel Planning
- **Novel Project Management**: Create and organize novel projects with customizable POV styles and tenses
- **Chapter Organization**: Structure your novel with detailed chapter outlines
- **Story Beat Tracking**: Track up to 250+ story beats across your narrative
- **POV Management**: Support for single, dual, or multiple POV narratives

### Cloud Integrations

#### Supabase Integration
- Real-time database synchronization
- User authentication support
- Automatic data backups
- Live collaboration features

#### Notion Integration
- Sync credit memos to Notion databases
- Create structured novel project pages
- Track chapters and story beats in Notion
- Collaborative editing and commenting

#### Google Drive Integration
- Create Google Docs for each chapter
- Generate financial spreadsheets automatically
- Organize files in dedicated folders
- Share documents with team members

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd commodities-credit-workspace
```

2. Install dependencies:
```bash
npm install
```

3. Run the setup wizard:
```bash
npm run setup
```

4. Follow the prompts to configure your integrations.

## Configuration

### Manual Configuration
If you prefer to configure manually, create a `.env` file with the following variables:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Notion Configuration
NOTION_API_KEY=your_notion_integration_token
NOTION_DATABASE_ID_CREDIT=your_notion_database_id_for_credit_memos
NOTION_DATABASE_ID_NOVELS=your_notion_database_id_for_novels

# Google Drive Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
GOOGLE_DRIVE_FOLDER_ID=your_google_drive_folder_id

# JWT Secret for authentication
JWT_SECRET=your_jwt_secret_key_here

# Server Configuration
PORT=3000
NODE_ENV=development
```

## Setting Up Integrations

### Supabase Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Navigate to Settings > API to find your project URL and keys
3. Create the following tables in your Supabase dashboard:
   - companies
   - financial_data
   - credit_memos
   - novels
   - chapters
   - story_beats

### Notion Setup
1. Create a Notion integration at [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Create two databases in Notion:
   - Credit Memos database with properties: Title, Company, Memo Type, Industry, Date
   - Novels database with properties: Title, POV Style, Tense, Target Chapters, Target Beats, Status
3. Share the databases with your integration

### Google Drive Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google Drive API
4. Create OAuth 2.0 credentials
5. Add `http://localhost:3000/auth/google/callback` to authorized redirect URIs
6. Download credentials and add to `.env` file

## Usage

### Starting the Application
```bash
npm start
```

The application will be available at `http://localhost:3000`

### Using the Application

1. **Credit Analysis Tab**:
   - Add companies you want to analyze
   - Upload financial documents for OCR processing
   - Generate credit memos with financial metrics

2. **Novel Planning Tab**:
   - Create novel projects with target chapters and beats
   - Add chapters with POV characters and summaries
   - Track story beats with beat types (setup, climax, resolution, etc.)

3. **Integrations Tab**:
   - Connect to Google Drive for document storage
   - Sync data to Supabase for real-time collaboration
   - Export to Notion for advanced documentation
   - Configure auto-sync settings

## API Endpoints

### Credit Analysis
- `GET /api/companies` - List all companies
- `POST /api/companies` - Create new company
- `POST /api/upload-financial` - Upload financial document
- `POST /api/credit-memos` - Create credit memo

### Novel Planning
- `GET /api/novels` - List all novels
- `POST /api/novels` - Create new novel
- `GET /api/novels/:id/chapters` - Get chapters for a novel
- `POST /api/chapters` - Create new chapter
- `GET /api/novels/:id/beats` - Get story beats
- `POST /api/beats` - Create story beat

### Integration Endpoints
- `POST /api/sync/supabase/companies` - Sync companies to Supabase
- `POST /api/sync/notion/credit-memo` - Create Notion credit memo
- `POST /api/sync/notion/novel` - Create Notion novel page
- `GET /api/auth/google` - Get Google auth URL
- `POST /api/drive/create-chapter-doc` - Create Google Doc for chapter
- `POST /api/drive/create-financial-sheet` - Create financial spreadsheet
- `POST /api/sync/all` - Sync to all connected services

## Development

### Project Structure
```
├── server.js              # Main server file
├── services/
│   ├── supabase.js       # Supabase integration
│   ├── notion.js         # Notion integration
│   └── googleDrive.js    # Google Drive integration
├── public/
│   ├── index.html        # Main HTML file
│   ├── script.js         # Frontend JavaScript
│   └── styles.css        # CSS styles
├── uploads/              # Temporary file uploads
└── workspace.db          # Local SQLite database
```

### Adding New Features
1. Update the database schema in `server.js`
2. Add corresponding Supabase tables if using Supabase
3. Update frontend in `public/` files
4. Add integration endpoints as needed

## Troubleshooting

### Common Issues

1. **Supabase connection failed**: Check your Supabase URL and keys in `.env`
2. **Notion sync not working**: Ensure your integration has access to the databases
3. **Google Drive authentication error**: Verify redirect URI matches configuration
4. **Port already in use**: Change PORT in `.env` file

### Debug Mode
Set `NODE_ENV=development` in `.env` for detailed error messages

## Security Notes

- Never commit `.env` file to version control
- Use environment variables for all sensitive data
- Regularly rotate API keys and secrets
- Enable 2FA on all cloud service accounts

## Support

For issues, questions, or feature requests, please create an issue in the repository.

## License

MIT License - See LICENSE file for details