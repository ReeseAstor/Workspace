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

## Cloud Integrations

This app supports optional integrations with Supabase (Storage), Notion (pages for credit memos), and Google Drive (document uploads).

### Setup

1. Copy the env template and edit values:
```bash
cp .env.example .env
```
2. Enable desired providers by setting flags to `true`:
   - `ENABLE_SUPABASE`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET`, `SUPABASE_PUBLIC_FILES`
   - `ENABLE_NOTION`, `NOTION_TOKEN`, `NOTION_DATABASE_ID`
   - `ENABLE_GOOGLE_DRIVE`, `GOOGLE_APPLICATION_CREDENTIALS`, `GDRIVE_FOLDER_ID`, `GDRIVE_MAKE_PUBLIC`

### Supabase
- Create a storage bucket (default: `financial-docs`).
- Use the Service Role key server-side only.

### Notion
- Create an internal integration and share a database with it.
- Use the shared database ID for `NOTION_DATABASE_ID`.

### Google Drive
- Create a Google Cloud Service Account, enable Drive API.
- Share your target Drive folder with the service account email.
- Set `GOOGLE_APPLICATION_CREDENTIALS` to the JSON credentials file path.