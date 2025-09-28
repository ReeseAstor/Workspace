const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();

// Import configurations and services
const { supabase, supabaseAdmin } = require('./config/supabase');
const { notion, notionHelpers } = require('./config/notion');
const { oauth2Client, googleDriveHelpers } = require('./config/googleDrive');
const { authenticateToken, optionalAuth } = require('./middleware/auth');
const syncService = require('./services/syncService');

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

// Authentication Routes
app.post('/auth/signup', async (req, res) => {
    try {
        const { email, password, fullName } = req.body;
        
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            user_metadata: { full_name: fullName },
            email_confirm: true
        });

        if (error) throw error;

        res.json({ user: data.user, message: 'User created successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/auth/signin', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        res.json({ user: data.user, session: data.session });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/auth/signout', authenticateToken, async (req, res) => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        res.json({ message: 'Signed out successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Google OAuth Routes
app.get('/auth/google', (req, res) => {
    const authUrl = googleDriveHelpers.getAuthUrl();
    res.json({ authUrl });
});

app.get('/auth/google/callback', authenticateToken, async (req, res) => {
    try {
        const { code } = req.query;
        const tokens = await googleDriveHelpers.getTokens(code);
        
        // Store tokens in user profile
        const { error } = await supabaseAdmin
            .from('profiles')
            .update({ google_tokens: tokens })
            .eq('id', req.user.id);

        if (error) throw error;

        res.redirect('/?google_auth=success');
    } catch (error) {
        res.redirect('/?google_auth=error');
    }
});

// User profile routes
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', req.user.id)
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/profile', authenticateToken, async (req, res) => {
    try {
        const { full_name, notion_workspace_id } = req.body;
        
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update({ 
                full_name,
                notion_workspace_id,
                updated_at: new Date().toISOString()
            })
            .eq('id', req.user.id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Credit Analysis Routes
app.get('/api/companies', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('companies')
            .select('*')
            .eq('user_id', req.user.id)
            .order('name');

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/companies', authenticateToken, async (req, res) => {
    try {
        const { name, industry } = req.body;
        
        const { data, error } = await supabaseAdmin
            .from('companies')
            .insert({
                name,
                industry,
                user_id: req.user.id
            })
            .select()
            .single();

        if (error) throw error;

        // Sync to external services
        const syncResults = await syncService.syncCompany(req.user.id, data);
        
        res.json({ 
            ...data, 
            sync_status: syncResults,
            message: 'Company created and syncing to external services' 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/upload-financial', authenticateToken, upload.single('document'), async (req, res) => {
    try {
        const { company_id, document_type } = req.body;
        const file_path = req.file.path;
        
        // Basic OCR simulation - in a real implementation, you'd use tesseract.js or similar
        const extracted_data = `Extracted financial data from ${req.file.originalname}`;
        
        // Get company info for Google Drive upload
        const { data: company, error: companyError } = await supabaseAdmin
            .from('companies')
            .select('name')
            .eq('id', company_id)
            .eq('user_id', req.user.id)
            .single();

        if (companyError) throw companyError;

        let googleDriveResult = null;
        
        // Upload to Google Drive if user has connected their account
        try {
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('google_tokens')
                .eq('id', req.user.id)
                .single();

            if (profile?.google_tokens) {
                googleDriveHelpers.setCredentials(profile.google_tokens);
                googleDriveResult = await googleDriveHelpers.uploadFinancialDocument(
                    file_path,
                    req.file.originalname,
                    company.name,
                    document_type
                );
            }
        } catch (driveError) {
            console.error('Google Drive upload failed:', driveError);
            // Continue without Google Drive upload
        }

        // Store in Supabase
        const { data, error } = await supabaseAdmin
            .from('financial_data')
            .insert({
                company_id,
                user_id: req.user.id,
                document_type,
                original_filename: req.file.originalname,
                file_path,
                google_drive_file_id: googleDriveResult?.id,
                google_drive_link: googleDriveResult?.webViewLink,
                extracted_data
            })
            .select()
            .single();

        if (error) throw error;

        res.json({ 
            ...data, 
            google_drive_backup: googleDriveResult ? true : false,
            message: 'Financial document uploaded and processed' 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/credit-memos', authenticateToken, async (req, res) => {
    try {
        const { company_id, memo_type, title, content, financial_metrics } = req.body;
        
        // Get company name for Notion sync
        const { data: company, error: companyError } = await supabaseAdmin
            .from('companies')
            .select('name')
            .eq('id', company_id)
            .eq('user_id', req.user.id)
            .single();

        if (companyError) throw companyError;

        const { data, error } = await supabaseAdmin
            .from('credit_memos')
            .insert({
                company_id,
                user_id: req.user.id,
                memo_type,
                title,
                content,
                financial_metrics: typeof financial_metrics === 'string' ? JSON.parse(financial_metrics) : financial_metrics
            })
            .select()
            .single();

        if (error) throw error;

        // Sync to external services
        const syncResults = await syncService.syncCreditMemo(req.user.id, data, company.name);
        
        res.json({ 
            ...data, 
            sync_status: syncResults,
            message: 'Credit memo created and syncing to external services' 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Novel Planning Routes
app.get('/api/novels', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('novels')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/novels', authenticateToken, async (req, res) => {
    try {
        const { title, description, pov_style, tense, target_chapters, target_beats } = req.body;
        
        const { data, error } = await supabaseAdmin
            .from('novels')
            .insert({
                title,
                description,
                pov_style: pov_style || 'dual_alternating',
                tense: tense || 'past',
                target_chapters: target_chapters || 25,
                target_beats: target_beats || 250,
                user_id: req.user.id
            })
            .select()
            .single();

        if (error) throw error;

        // Sync to external services
        const syncResults = await syncService.syncNovel(req.user.id, data);
        
        res.json({ 
            ...data, 
            sync_status: syncResults,
            message: 'Novel created and syncing to external services' 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/novels/:id/chapters', authenticateToken, async (req, res) => {
    try {
        const novel_id = req.params.id;
        
        const { data, error } = await supabaseAdmin
            .from('chapters')
            .select('*')
            .eq('novel_id', novel_id)
            .eq('user_id', req.user.id)
            .order('chapter_number');

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/chapters', authenticateToken, async (req, res) => {
    try {
        const { novel_id, chapter_number, title, pov_character, summary, content } = req.body;
        
        const { data, error } = await supabaseAdmin
            .from('chapters')
            .insert({
                novel_id,
                chapter_number,
                title,
                pov_character,
                summary,
                content,
                user_id: req.user.id
            })
            .select()
            .single();

        if (error) throw error;

        // Backup to Google Drive if content is provided
        if (content) {
            try {
                const { data: novel } = await supabaseAdmin
                    .from('novels')
                    .select('title')
                    .eq('id', novel_id)
                    .single();
                
                await syncService.backupChapter(req.user.id, data, novel.title);
            } catch (backupError) {
                console.error('Chapter backup failed:', backupError);
            }
        }

        res.json({ 
            ...data, 
            message: 'Chapter created' + (content ? ' and backed up to Google Drive' : '')
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/novels/:id/beats', authenticateToken, async (req, res) => {
    try {
        const novel_id = req.params.id;
        
        const { data, error } = await supabaseAdmin
            .from('story_beats')
            .select('*')
            .eq('novel_id', novel_id)
            .eq('user_id', req.user.id)
            .order('beat_number');

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/beats', authenticateToken, async (req, res) => {
    try {
        const { novel_id, chapter_id, beat_number, description, beat_type, pov_character } = req.body;
        
        const { data, error } = await supabaseAdmin
            .from('story_beats')
            .insert({
                novel_id,
                chapter_id,
                beat_number,
                description,
                beat_type,
                pov_character,
                user_id: req.user.id
            })
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Sync status endpoint
app.get('/api/sync-status/:entity_type/:entity_id', authenticateToken, async (req, res) => {
    try {
        const { entity_type, entity_id } = req.params;
        const status = await syncService.getSyncStatus(req.user.id, entity_type, entity_id);
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Manual sync trigger
app.post('/api/sync/:entity_type/:entity_id', authenticateToken, async (req, res) => {
    try {
        const { entity_type, entity_id } = req.params;
        let syncResults = {};
        
        if (entity_type === 'company') {
            const { data: company } = await supabaseAdmin
                .from('companies')
                .select('*')
                .eq('id', entity_id)
                .eq('user_id', req.user.id)
                .single();
            
            syncResults = await syncService.syncCompany(req.user.id, company, 'update');
        } else if (entity_type === 'novel') {
            const { data: novel } = await supabaseAdmin
                .from('novels')
                .select('*')
                .eq('id', entity_id)
                .eq('user_id', req.user.id)
                .single();
            
            syncResults = await syncService.syncNovel(req.user.id, novel, 'update');
        }
        
        res.json({ sync_results: syncResults, message: 'Manual sync completed' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
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