require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { integrations, uploadFileToSupabase, uploadFileToGoogleDrive, exportCreditMemoToNotion } = require('./config/integrations');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Ensure uploads directory exists
try {
    if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
        fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
    }
} catch (e) {
    console.error('Failed to ensure uploads directory:', e.message);
}

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
        supabase_path TEXT,
        supabase_public_url TEXT,
        gdrive_file_id TEXT,
        gdrive_web_view_link TEXT,
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
        notion_url TEXT,
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

// Utility to add a column if it does not exist (for existing DBs)
function ensureColumnExists(tableName, columnName, columnType) {
    return new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
            if (err) return reject(err);
            const exists = rows.some(r => r.name === columnName);
            if (exists) return resolve();
            db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`, (alterErr) => {
                if (alterErr) return reject(alterErr);
                resolve();
            });
        });
    });
}

// Best-effort migrations for existing databases
(async () => {
    try {
        await ensureColumnExists('financial_data', 'supabase_path', 'TEXT');
        await ensureColumnExists('financial_data', 'supabase_public_url', 'TEXT');
        await ensureColumnExists('financial_data', 'gdrive_file_id', 'TEXT');
        await ensureColumnExists('financial_data', 'gdrive_web_view_link', 'TEXT');
        await ensureColumnExists('credit_memos', 'notion_page_id', 'TEXT');
        await ensureColumnExists('credit_memos', 'notion_url', 'TEXT');
    } catch (e) {
        console.warn('DB migration warning:', e.message);
    }
})();

// Routes

// Main dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Credit Analysis Routes
app.get('/api/integrations', (req, res) => {
    res.json({
        supabase: integrations.isSupabaseConfigured,
        notion: integrations.isNotionConfigured,
        googleDrive: integrations.isGoogleDriveConfigured,
    });
});
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
    const uploadToSupabase = String(req.body.uploadToSupabase).toLowerCase() === 'true';
    const uploadToDrive = String(req.body.uploadToDrive).toLowerCase() === 'true';
    const file_path = req.file.path;
    const mimeType = req.file.mimetype || 'application/octet-stream';

    // Basic OCR simulation - in a real implementation, you'd use tesseract.js or similar
    const extracted_data = `Extracted financial data from ${req.file.originalname}`;

    db.run('INSERT INTO financial_data (company_id, document_type, file_path, extracted_data) VALUES (?, ?, ?, ?)', 
           [company_id, document_type, file_path, extracted_data], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const recordId = this.lastID;
        (async () => {
            const updates = {};
            const originalName = (req.file.originalname || 'file').replace(/\s+/g, '_');
            const destinationPath = `company_${company_id || 'unknown'}/${Date.now()}_${originalName}`;
            try {
                if (uploadToSupabase && integrations.isSupabaseConfigured) {
                    const sb = await uploadFileToSupabase(file_path, destinationPath, mimeType);
                    updates.supabase_path = sb.path;
                    updates.supabase_public_url = sb.publicUrl;
                }
            } catch (e) {
                console.warn('Supabase upload failed:', e.message);
            }
            try {
                if (uploadToDrive && integrations.isGoogleDriveConfigured) {
                    const driveRes = await uploadFileToGoogleDrive(file_path, originalName, mimeType);
                    updates.gdrive_file_id = driveRes.id;
                    updates.gdrive_web_view_link = driveRes.webViewLink || driveRes.webContentLink || null;
                }
            } catch (e) {
                console.warn('Google Drive upload failed:', e.message);
            }

            if (Object.keys(updates).length > 0) {
                const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
                const params = [...Object.values(updates), recordId];
                db.run(`UPDATE financial_data SET ${setClauses} WHERE id = ?`, params, (updErr) => {
                    if (updErr) {
                        console.warn('Failed to update financial_data with external links:', updErr.message);
                    }
                    res.json({ id: recordId, message: 'Financial document uploaded and processed', ...updates });
                });
            } else {
                res.json({ id: recordId, message: 'Financial document uploaded and processed' });
            }
        })();
    });
});

app.post('/api/credit-memos', (req, res) => {
    const { company_id, memo_type, title, content } = req.body;
    const financial_metrics = req.body.financial_metrics || {};
    const exportToNotion = String(req.body.exportToNotion).toLowerCase() === 'true';

    db.run('INSERT INTO credit_memos (company_id, memo_type, title, content, financial_metrics) VALUES (?, ?, ?, ?, ?)', 
           [company_id, memo_type, title, content, JSON.stringify(financial_metrics)], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const recordId = this.lastID;
        (async () => {
            if (exportToNotion && integrations.isNotionConfigured) {
                try {
                    const page = await exportCreditMemoToNotion({ company_id, memo_type, title, content, financial_metrics });
                    const notion_page_id = page.id;
                    const notion_url = page.url || null;
                    db.run('UPDATE credit_memos SET notion_page_id = ?, notion_url = ? WHERE id = ?', [notion_page_id, notion_url, recordId], (updErr) => {
                        if (updErr) {
                            console.warn('Failed to update credit memo with Notion info:', updErr.message);
                        }
                        res.json({ id: recordId, message: 'Credit memo created', notion_page_id, notion_url });
                    });
                    return;
                } catch (e) {
                    console.warn('Notion export failed:', e.message);
                }
            }
            res.json({ id: recordId, message: 'Credit memo created' });
        })();
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