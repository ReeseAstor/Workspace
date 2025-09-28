const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const config = require('./config/env');
const { uploadFinancialDocument } = require('./services/supabase');
const { uploadFile: uploadToGoogleDrive } = require('./services/googleDrive');
const { createCreditMemoPage } = require('./services/notion');

const app = express();
const PORT = config.port || process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Multer setup for file uploads
try {
    if (!fs.existsSync('uploads')) {
        fs.mkdirSync('uploads');
    }
} catch (e) {
    console.error('Failed to ensure uploads directory exists:', e.message || e);
}
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
        supabase_path TEXT,
        supabase_public_url TEXT,
        gdrive_file_id TEXT,
        gdrive_web_view TEXT,
        gdrive_web_content TEXT,
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
        notion_page_id TEXT,
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

app.post('/api/upload-financial', upload.single('document'), async (req, res) => {
    const { company_id, document_type } = req.body;
    const file_path = req.file.path;
    
    // Basic OCR simulation - in a real implementation, you'd use tesseract.js or similar
    const extracted_data = `Extracted financial data from ${req.file.originalname}`;
    // Upload to cloud providers if enabled
    let supabase_path = null;
    let supabase_public_url = null;
    let gdrive_file_id = null;
    let gdrive_web_view = null;
    let gdrive_web_content = null;

    try {
        const filename = path.basename(file_path);
        const remotePath = `company_${company_id}/${Date.now()}_${filename}`;
        const sup = await uploadFinancialDocument(file_path, remotePath);
        if (sup && sup.path) {
            supabase_path = sup.path;
            supabase_public_url = sup.publicUrl || null;
        }
    } catch (e) {
        console.error('Supabase upload failed:', e.message || e);
    }

    try {
        const filename = path.basename(file_path);
        const gd = await uploadToGoogleDrive(file_path, `${Date.now()}_${filename}`);
        if (gd && gd.id) {
            gdrive_file_id = gd.id;
            gdrive_web_view = gd.webViewLink || null;
            gdrive_web_content = gd.webContentLink || null;
        }
    } catch (e) {
        console.error('Google Drive upload failed:', e.message || e);
    }

    db.run('INSERT INTO financial_data (company_id, document_type, file_path, supabase_path, supabase_public_url, gdrive_file_id, gdrive_web_view, gdrive_web_content, extracted_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', 
           [company_id, document_type, file_path, supabase_path, supabase_public_url, gdrive_file_id, gdrive_web_view, gdrive_web_content, extracted_data], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ id: this.lastID, message: 'Financial document uploaded and processed' });
        }
    });
});

app.post('/api/credit-memos', async (req, res) => {
    const { company_id, memo_type, title, content, financial_metrics } = req.body;
    let notion_page_id = null;

    try {
        // Fetch company name for context
        let companyName = null;
        await new Promise((resolve) => {
            db.get('SELECT name FROM companies WHERE id = ?', [company_id], (e, row) => {
                if (!e && row) companyName = row.name;
                resolve();
            });
        });
        const metricsObj = typeof financial_metrics === 'string' ? JSON.parse(financial_metrics) : (financial_metrics || {});
        const page = await createCreditMemoPage({ title, content, memoType: memo_type, companyName, metrics: metricsObj });
        if (page && page.pageId) notion_page_id = page.pageId;
    } catch (e) {
        console.error('Notion page creation failed:', e.message || e);
    }

    db.run('INSERT INTO credit_memos (company_id, memo_type, title, content, financial_metrics, notion_page_id) VALUES (?, ?, ?, ?, ?, ?)', 
           [company_id, memo_type, title, content, JSON.stringify(financial_metrics), notion_page_id], function(err) {
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

// Start server
app.listen(PORT, () => {
    console.log(`Workspace server running on port ${PORT}`);
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