const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();

// Import integration services
const supabaseService = require('./services/supabase');
const notionService = require('./services/notion');
const googleDriveService = require('./services/googleDrive');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Multer setup for file uploads
const upload = multer({ dest: 'uploads/' });

// Database setup
const db = new sqlite3.Database('workspace.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        initializeDatabase();
    }
});

function initializeDatabase() {
    // Credit Analysis Tables
    db.run(`CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        industry TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS financial_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER,
        document_type TEXT,
        file_path TEXT,
        extracted_data TEXT,
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES companies (id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS credit_memos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER,
        memo_type TEXT,
        title TEXT,
        content TEXT,
        financial_metrics TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES companies (id)
    )`);

    // Novel Planning Tables
    db.run(`CREATE TABLE IF NOT EXISTS novels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        pov_style TEXT DEFAULT 'dual_alternating',
        tense TEXT DEFAULT 'past',
        target_chapters INTEGER DEFAULT 25,
        target_beats INTEGER DEFAULT 250,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS chapters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        novel_id INTEGER,
        chapter_number INTEGER,
        title TEXT,
        pov_character TEXT,
        summary TEXT,
        word_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (novel_id) REFERENCES novels (id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS story_beats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        novel_id INTEGER,
        chapter_id INTEGER,
        beat_number INTEGER,
        description TEXT,
        beat_type TEXT,
        pov_character TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (novel_id) REFERENCES novels (id),
        FOREIGN KEY (chapter_id) REFERENCES chapters (id)
    )`);
}

// Routes

// Main dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Credit Analysis Routes
app.get('/api/companies', (req, res) => {
    db.all('SELECT * FROM companies ORDER BY name', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.post('/api/companies', (req, res) => {
    const { name, industry } = req.body;
    db.run('INSERT INTO companies (name, industry) VALUES (?, ?)', [name, industry], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ id: this.lastID, name, industry });
        }
    });
});

app.post('/api/upload-financial', upload.single('document'), (req, res) => {
    const { company_id, document_type } = req.body;
    const file_path = req.file.path;
    
    // Basic OCR simulation - in a real implementation, you'd use tesseract.js or similar
    const extracted_data = `Extracted financial data from ${req.file.originalname}`;
    
    db.run('INSERT INTO financial_data (company_id, document_type, file_path, extracted_data) VALUES (?, ?, ?, ?)', 
           [company_id, document_type, file_path, extracted_data], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ id: this.lastID, message: 'Financial document uploaded and processed' });
        }
    });
});

app.post('/api/credit-memos', (req, res) => {
    const { company_id, memo_type, title, content, financial_metrics } = req.body;
    db.run('INSERT INTO credit_memos (company_id, memo_type, title, content, financial_metrics) VALUES (?, ?, ?, ?, ?)', 
           [company_id, memo_type, title, content, JSON.stringify(financial_metrics)], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ id: this.lastID, message: 'Credit memo created' });
        }
    });
});

// Novel Planning Routes
app.get('/api/novels', (req, res) => {
    db.all('SELECT * FROM novels ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.post('/api/novels', (req, res) => {
    const { title, description, pov_style, tense, target_chapters, target_beats } = req.body;
    db.run('INSERT INTO novels (title, description, pov_style, tense, target_chapters, target_beats) VALUES (?, ?, ?, ?, ?, ?)', 
           [title, description, pov_style || 'dual_alternating', tense || 'past', target_chapters || 25, target_beats || 250], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ id: this.lastID, title, description });
        }
    });
});

app.get('/api/novels/:id/chapters', (req, res) => {
    const novel_id = req.params.id;
    db.all('SELECT * FROM chapters WHERE novel_id = ? ORDER BY chapter_number', [novel_id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.post('/api/chapters', (req, res) => {
    const { novel_id, chapter_number, title, pov_character, summary } = req.body;
    db.run('INSERT INTO chapters (novel_id, chapter_number, title, pov_character, summary) VALUES (?, ?, ?, ?, ?)', 
           [novel_id, chapter_number, title, pov_character, summary], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ id: this.lastID, novel_id, chapter_number, title });
        }
    });
});

app.get('/api/novels/:id/beats', (req, res) => {
    const novel_id = req.params.id;
    db.all('SELECT * FROM story_beats WHERE novel_id = ? ORDER BY beat_number', [novel_id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.post('/api/beats', (req, res) => {
    const { novel_id, chapter_id, beat_number, description, beat_type, pov_character } = req.body;
    db.run('INSERT INTO story_beats (novel_id, chapter_id, beat_number, description, beat_type, pov_character) VALUES (?, ?, ?, ?, ?, ?)', 
           [novel_id, chapter_id, beat_number, description, beat_type, pov_character], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ id: this.lastID, novel_id, beat_number, description });
        }
    });
});

// Integration Routes

// Supabase sync endpoints
app.post('/api/sync/supabase/companies', async (req, res) => {
    try {
        const companies = await supabaseService.getCompanies();
        res.json({ success: true, data: companies });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/sync/supabase/novels', async (req, res) => {
    try {
        const novels = await supabaseService.getNovels();
        res.json({ success: true, data: novels });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Notion sync endpoints
app.post('/api/sync/notion/credit-memo', async (req, res) => {
    const { memoData } = req.body;
    try {
        const pageId = await notionService.createCreditMemoPage(memoData);
        res.json({ success: true, notionPageId: pageId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/sync/notion/novel', async (req, res) => {
    const { novelData } = req.body;
    try {
        const pageId = await notionService.createNovelPage(novelData);
        res.json({ success: true, notionPageId: pageId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Google Drive endpoints
app.get('/api/auth/google', (req, res) => {
    const authUrl = googleDriveService.getAuthUrl();
    if (authUrl) {
        res.json({ authUrl });
    } else {
        res.status(400).json({ error: 'Google Drive not configured' });
    }
});

app.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    if (code) {
        const tokens = await googleDriveService.getTokens(code);
        if (tokens) {
            res.redirect('/?google_auth=success');
        } else {
            res.redirect('/?google_auth=failed');
        }
    } else {
        res.redirect('/?google_auth=failed');
    }
});

app.post('/api/drive/create-chapter-doc', async (req, res) => {
    const { chapterData, folderId } = req.body;
    try {
        const doc = await googleDriveService.createChapterDocument(chapterData, folderId);
        res.json({ success: true, document: doc });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/drive/create-financial-sheet', async (req, res) => {
    const { companyData, financialData } = req.body;
    try {
        const sheet = await googleDriveService.createFinancialSpreadsheet(companyData, financialData);
        res.json({ success: true, spreadsheet: sheet });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/drive/files', async (req, res) => {
    const { folderId } = req.query;
    try {
        const files = await googleDriveService.listFiles(folderId);
        res.json({ success: true, files });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Combined sync endpoint
app.post('/api/sync/all', async (req, res) => {
    const { type, data } = req.body;
    const results = {};

    try {
        if (type === 'credit_memo') {
            // Sync to Supabase
            if (supabaseService.supabase) {
                const supabaseResult = await supabaseService.createCreditMemo(data);
                results.supabase = supabaseResult;
            }

            // Sync to Notion
            if (notionService.notion) {
                const notionPageId = await notionService.createCreditMemoPage(data);
                results.notion = notionPageId;
            }

            // Create Google Sheet if financial data exists
            if (googleDriveService.drive && data.financial_metrics) {
                const sheet = await googleDriveService.createFinancialSpreadsheet(
                    { name: data.company_name, industry: data.industry },
                    data.financial_metrics
                );
                results.googleDrive = sheet;
            }
        } else if (type === 'novel') {
            // Sync to Supabase
            if (supabaseService.supabase) {
                const supabaseResult = await supabaseService.createNovel(data);
                results.supabase = supabaseResult;
            }

            // Sync to Notion
            if (notionService.notion) {
                const notionPageId = await notionService.createNovelPage(data);
                results.notion = notionPageId;
            }

            // Create Google Drive folder for novel
            if (googleDriveService.drive) {
                const folder = await googleDriveService.createFolder(data.title);
                results.googleDrive = folder;
            }
        } else if (type === 'chapter') {
            // Sync to Supabase
            if (supabaseService.supabase) {
                const supabaseResult = await supabaseService.createChapter(data);
                results.supabase = supabaseResult;
            }

            // Update Notion
            if (notionService.notion && data.notion_page_id) {
                await notionService.updateChapterInNotion(data.notion_page_id, data);
                results.notion = true;
            }

            // Create Google Doc
            if (googleDriveService.drive) {
                const doc = await googleDriveService.createChapterDocument(data, data.folder_id);
                results.googleDrive = doc;
            }
        }

        res.json({ success: true, results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Initialize Google Drive tokens on startup
(async () => {
    await googleDriveService.loadTokens();
})();

// Start server
app.listen(PORT, () => {
    console.log(`Workspace server running on port ${PORT}`);
    console.log('Integration services:');
    console.log('- Supabase:', supabaseService.supabase ? 'Connected' : 'Not configured');
    console.log('- Notion:', notionService.notion ? 'Connected' : 'Not configured');
    console.log('- Google Drive:', googleDriveService.oauth2Client ? 'Initialized' : 'Not configured');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Closing database connection...');
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Database connection closed.');
        process.exit(0);
    });
});