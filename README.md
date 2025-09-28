# Credit Analysis & Novel Planning Workspace

A comprehensive workspace application that combines credit analysis tools for commodities trading companies with novel planning and story development features.

## Features

### Credit Analysis for Commodities Trading
- **Company Management**: Track and manage up to 15 commodities trading companies
- **Financial Document OCR**: Upload and process financial documents (PDF, JPG, PNG, JPEG)
- **Credit Memo Generation**: Create various types of credit memos:
  - Annual Review
  - Refinancing
  - New Deals
  - Amendments
- **Financial Metrics Analysis**: Store and analyze financial data for consistent peer comparison
- **Database Storage**: All financial data and credit memos stored in SQLite database

### Novel Planning & Story Development
- **Novel Project Management**: Create and manage multiple novel projects
- **Chapter Management**: Organize novels into chapters (targeting 25 chapters)
- **Story Beats Tracking**: Track detailed story beats (targeting 250 beats per novel)
- **POV Support**: Built-in support for dual POV, alternating perspective novels
- **Tense Management**: Support for past and present tense narratives
- **Progress Tracking**: Monitor chapter and beat completion

## Screenshots

### Credit Analysis Interface
![Credit Analysis](https://github.com/user-attachments/assets/f43fa598-80b6-4711-96db-4368b32bad2d)

### Novel Planning Interface
![Novel Planning](https://github.com/user-attachments/assets/c93e654c-1e3d-4271-9d9d-50580f4a125d)

### Chapter Management in Action
![Chapter Management](https://github.com/user-attachments/assets/4dcd3180-067c-45dd-8b8b-8a0c28f8ba3c)

## Technology Stack

- **Backend**: Node.js with Express.js
- **Database**: SQLite3
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **File Upload**: Multer middleware
- **OCR**: Framework ready for integration with tesseract.js or similar

## Integrations

The app can integrate with Supabase Storage, Notion, and Google Drive. Use the checkboxes in the UI to opt-in per action. Availability is shown by enabling/disabling those checkboxes based on server configuration.

### Environment Variables

Copy `.env.example` to `.env` and fill values:

```bash
cp .env.example .env
```

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_ANON_KEY`): Supabase project credentials
- `SUPABASE_BUCKET`: Storage bucket name (default: `financial-documents`)
- `NOTION_TOKEN`, `NOTION_DATABASE_ID`: Notion internal integration token and database ID
- `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_DRIVE_FOLDER_ID`: Google service account and a target folder ID

Notes:
- For `GOOGLE_PRIVATE_KEY`, keep it on one line with `\n` for newlines, e.g. `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"`.
- The app automatically converts `\n` to real newlines at runtime.

### Supabase Setup
- Create a Supabase project and a Storage bucket (e.g. `financial-documents`).
- Optionally make the bucket public if you need public links, or keep private and serve via signed URLs (current code uses public URLs).
- Get the Service Role key for server-side uploads and set `SUPABASE_SERVICE_ROLE_KEY`.

### Notion Setup
- Create a Notion internal integration and get the token.
- Create a database (or use an existing one) and share it with the integration.
- Copy the database ID to `NOTION_DATABASE_ID`.

### Google Drive Setup
- Create a Google Cloud project and enable the Drive API.
- Create a Service Account and generate a JSON key.
- Use the service account email to share a target Drive folder (or its parent) with at least `Writer` access, and set that folder's ID in `GOOGLE_DRIVE_FOLDER_ID`.
- Put the JSON key fields into `.env`:
  - `GOOGLE_CLIENT_EMAIL`
  - `GOOGLE_PRIVATE_KEY` (escaped with `\n` as above)

### Runtime
- Start the server and visit `/api/integrations` to see booleans for configured services.
- In the UI, checkboxes will be disabled if a service is not configured.

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Workspace
```

2. Install dependencies:
```bash
npm install
```

3. Start the application:
```bash
npm start
```

4. Open your browser and navigate to `http://localhost:3000`

## Usage

### Credit Analysis Workflow

1. **Add Companies**: Start by adding commodities trading companies to the system
2. **Upload Financial Documents**: Upload financial statements, balance sheets, cash flow statements, or income statements
3. **Generate Credit Memos**: Create comprehensive credit memos with financial metrics analysis
4. **Peer Comparison**: Use stored data for consistent analysis across companies

### Novel Planning Workflow

1. **Create Novel Project**: Set up a new novel with target chapters (default: 25) and story beats (default: 250)
2. **Add Chapters**: Create individual chapters with POV character assignments and summaries
3. **Track Story Beats**: Add detailed story beats linked to chapters with type classification
4. **Monitor Progress**: Track completion towards your target chapter and beat counts

## API Endpoints

### Credit Analysis
- `GET /api/companies` - List all companies
- `POST /api/companies` - Add new company
- `POST /api/upload-financial` - Upload financial document
- `POST /api/credit-memos` - Create credit memo

### Novel Planning
- `GET /api/novels` - List all novels
- `POST /api/novels` - Create new novel
- `GET /api/novels/:id/chapters` - Get chapters for a novel
- `POST /api/chapters` - Add new chapter
- `GET /api/novels/:id/beats` - Get story beats for a novel
- `POST /api/beats` - Add new story beat

## Database Schema

The application uses SQLite with the following main tables:
- `companies` - Trading company information
- `financial_data` - Uploaded financial documents and OCR data
- `credit_memos` - Generated credit analysis memos
- `novels` - Novel project details
- `chapters` - Individual chapters with POV and summaries
- `story_beats` - Detailed story beats with type classification

## Development

The application is designed to be easily extensible:
- Add OCR libraries like tesseract.js for actual document processing
- Integrate financial analysis libraries for automated metrics calculation
- Add user authentication and multi-tenancy support
- Implement export features for credit memos and novel outlines

## License

MIT License