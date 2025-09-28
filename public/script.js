// Global state
let currentNovelId = null;
let companies = [];
let novels = [];

// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    // Navigation
    document.getElementById('credit-tab').addEventListener('click', () => switchTab('credit'));
    document.getElementById('novel-tab').addEventListener('click', () => switchTab('novel'));
    document.getElementById('integrations-tab').addEventListener('click', () => switchTab('integrations'));

    // Credit Analysis Forms
    document.getElementById('company-form').addEventListener('submit', handleCompanySubmit);
    document.getElementById('upload-form').addEventListener('submit', handleFileUpload);
    document.getElementById('memo-form').addEventListener('submit', handleMemoSubmit);

    // Novel Planning Forms
    document.getElementById('novel-form').addEventListener('submit', handleNovelSubmit);
    document.getElementById('chapter-form').addEventListener('submit', handleChapterSubmit);
    document.getElementById('beat-form').addEventListener('submit', handleBeatSubmit);

    // Integration buttons
    document.getElementById('sync-supabase-btn').addEventListener('click', syncToSupabase);
    document.getElementById('sync-notion-btn').addEventListener('click', syncToNotion);
    document.getElementById('auth-google-btn').addEventListener('click', authenticateGoogle);
    document.getElementById('sync-drive-btn').addEventListener('click', syncToGoogleDrive);
    document.getElementById('sync-settings-form').addEventListener('submit', saveSyncSettings);

    // Load initial data
    loadCompanies();
    loadNovels();
    checkIntegrationStatus();
    loadGoogleDriveFiles();
    
    // Check for Google auth callback
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('google_auth') === 'success') {
        showSuccess('Successfully connected to Google Drive!');
        window.history.replaceState({}, document.title, '/');
        loadGoogleDriveFiles();
    }
});

// Navigation
function switchTab(tab) {
    document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));

    if (tab === 'credit') {
        document.getElementById('credit-tab').classList.add('active');
        document.getElementById('credit-section').classList.add('active');
    } else if (tab === 'novel') {
        document.getElementById('novel-tab').classList.add('active');
        document.getElementById('novel-section').classList.add('active');
    } else if (tab === 'integrations') {
        document.getElementById('integrations-tab').classList.add('active');
        document.getElementById('integrations-section').classList.add('active');
    }
}

// Credit Analysis Functions
async function loadCompanies() {
    try {
        const response = await fetch('/api/companies');
        companies = await response.json();
        renderCompanies();
        updateCompanySelects();
    } catch (error) {
        showError('Failed to load companies: ' + error.message);
    }
}

function renderCompanies() {
    const container = document.getElementById('companies-list');
    container.innerHTML = companies.map(company => `
        <div class="list-item">
            <h4>${company.name}</h4>
            <p>Industry: ${company.industry || 'Not specified'}</p>
            <p>Added: ${new Date(company.created_at).toLocaleDateString()}</p>
        </div>
    `).join('');
}

function updateCompanySelects() {
    const selects = ['upload-company', 'memo-company'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Select Company</option>' +
            companies.map(company => `<option value="${company.id}">${company.name}</option>`).join('');
    });
}

async function handleCompanySubmit(e) {
    e.preventDefault();
    const name = document.getElementById('company-name').value;
    const industry = document.getElementById('company-industry').value;

    try {
        const response = await fetch('/api/companies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, industry })
        });

        if (response.ok) {
            showSuccess('Company added successfully!');
            document.getElementById('company-form').reset();
            loadCompanies();
        } else {
            throw new Error('Failed to add company');
        }
    } catch (error) {
        showError('Error adding company: ' + error.message);
    }
}

async function handleFileUpload(e) {
    e.preventDefault();
    const formData = new FormData();
    formData.append('company_id', document.getElementById('upload-company').value);
    formData.append('document_type', document.getElementById('document-type').value);
    formData.append('document', document.getElementById('financial-document').files[0]);

    try {
        const response = await fetch('/api/upload-financial', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            showSuccess('Financial document uploaded and processed successfully!');
            document.getElementById('upload-form').reset();
        } else {
            throw new Error('Failed to upload document');
        }
    } catch (error) {
        showError('Error uploading document: ' + error.message);
    }
}

async function handleMemoSubmit(e) {
    e.preventDefault();
    const memoData = {
        company_id: document.getElementById('memo-company').value,
        memo_type: document.getElementById('memo-type').value,
        title: document.getElementById('memo-title').value,
        content: document.getElementById('memo-content').value,
        financial_metrics: parseJSON(document.getElementById('memo-metrics').value)
    };

    try {
        const response = await fetch('/api/credit-memos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(memoData)
        });

        if (response.ok) {
            showSuccess('Credit memo created successfully!');
            document.getElementById('memo-form').reset();
        } else {
            throw new Error('Failed to create credit memo');
        }
    } catch (error) {
        showError('Error creating credit memo: ' + error.message);
    }
}

// Novel Planning Functions
async function loadNovels() {
    try {
        const response = await fetch('/api/novels');
        novels = await response.json();
        renderNovels();
    } catch (error) {
        showError('Failed to load novels: ' + error.message);
    }
}

function renderNovels() {
    const container = document.getElementById('novels-list');
    container.innerHTML = novels.map(novel => `
        <div class="list-item">
            <h4>${novel.title}</h4>
            <p>${novel.description || 'No description'}</p>
            <p>POV: ${novel.pov_style} | Tense: ${novel.tense}</p>
            <p>Target: ${novel.target_chapters} chapters, ${novel.target_beats} beats</p>
            <button onclick="selectNovel(${novel.id})">Work on This Novel</button>
        </div>
    `).join('');
}

async function selectNovel(novelId) {
    currentNovelId = novelId;
    const novel = novels.find(n => n.id === novelId);
    
    // Show chapter and beats sections
    document.getElementById('chapter-section').style.display = 'block';
    document.getElementById('beats-section').style.display = 'block';
    
    // Set novel ID in forms
    document.getElementById('chapter-novel-id').value = novelId;
    document.getElementById('beat-novel-id').value = novelId;
    
    // Load chapters and beats
    await loadChapters(novelId);
    await loadBeats(novelId);
    
    showSuccess(`Now working on: ${novel.title}`);
}

async function loadChapters(novelId) {
    try {
        const response = await fetch(`/api/novels/${novelId}/chapters`);
        const chapters = await response.json();
        renderChapters(chapters);
        updateChapterSelect(chapters);
    } catch (error) {
        showError('Failed to load chapters: ' + error.message);
    }
}

function renderChapters(chapters) {
    const container = document.getElementById('chapters-list');
    container.innerHTML = chapters.map(chapter => `
        <div class="list-item">
            <h4>Chapter ${chapter.chapter_number}: ${chapter.title}</h4>
            <p>POV: ${chapter.pov_character}</p>
            <p>${chapter.summary || 'No summary'}</p>
        </div>
    `).join('');
}

function updateChapterSelect(chapters) {
    const select = document.getElementById('beat-chapter');
    select.innerHTML = '<option value="">Select Chapter</option>' +
        chapters.map(chapter => `<option value="${chapter.id}">Ch${chapter.chapter_number}: ${chapter.title}</option>`).join('');
}

async function loadBeats(novelId) {
    try {
        const response = await fetch(`/api/novels/${novelId}/beats`);
        const beats = await response.json();
        renderBeats(beats);
    } catch (error) {
        showError('Failed to load story beats: ' + error.message);
    }
}

function renderBeats(beats) {
    const container = document.getElementById('beats-list');
    container.innerHTML = beats.map(beat => `
        <div class="list-item">
            <h4>Beat ${beat.beat_number} (${beat.beat_type})</h4>
            <p>POV: ${beat.pov_character}</p>
            <p>${beat.description}</p>
        </div>
    `).join('');
}

async function handleNovelSubmit(e) {
    e.preventDefault();
    const novelData = {
        title: document.getElementById('novel-title').value,
        description: document.getElementById('novel-description').value,
        pov_style: document.getElementById('novel-pov').value,
        tense: document.getElementById('novel-tense').value,
        target_chapters: parseInt(document.getElementById('target-chapters').value),
        target_beats: parseInt(document.getElementById('target-beats').value)
    };

    try {
        const response = await fetch('/api/novels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novelData)
        });

        if (response.ok) {
            showSuccess('Novel project created successfully!');
            document.getElementById('novel-form').reset();
            loadNovels();
        } else {
            throw new Error('Failed to create novel project');
        }
    } catch (error) {
        showError('Error creating novel project: ' + error.message);
    }
}

async function handleChapterSubmit(e) {
    e.preventDefault();
    const chapterData = {
        novel_id: currentNovelId,
        chapter_number: parseInt(document.getElementById('chapter-number').value),
        title: document.getElementById('chapter-title').value,
        pov_character: document.getElementById('chapter-pov').value,
        summary: document.getElementById('chapter-summary').value
    };

    try {
        const response = await fetch('/api/chapters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(chapterData)
        });

        if (response.ok) {
            showSuccess('Chapter added successfully!');
            document.getElementById('chapter-form').reset();
            loadChapters(currentNovelId);
        } else {
            throw new Error('Failed to add chapter');
        }
    } catch (error) {
        showError('Error adding chapter: ' + error.message);
    }
}

async function handleBeatSubmit(e) {
    e.preventDefault();
    const beatData = {
        novel_id: currentNovelId,
        chapter_id: document.getElementById('beat-chapter').value || null,
        beat_number: parseInt(document.getElementById('beat-number').value),
        description: document.getElementById('beat-description').value,
        beat_type: document.getElementById('beat-type').value,
        pov_character: document.getElementById('beat-pov').value
    };

    try {
        const response = await fetch('/api/beats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(beatData)
        });

        if (response.ok) {
            showSuccess('Story beat added successfully!');
            document.getElementById('beat-form').reset();
            loadBeats(currentNovelId);
        } else {
            throw new Error('Failed to add story beat');
        }
    } catch (error) {
        showError('Error adding story beat: ' + error.message);
    }
}

// Utility Functions
function showSuccess(message) {
    showMessage(message, 'success');
}

function showError(message) {
    showMessage(message, 'error');
}

function showMessage(message, type) {
    const existingMessage = document.querySelector('.success-message, .error-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
    messageDiv.textContent = message;
    
    document.querySelector('.container').insertBefore(messageDiv, document.querySelector('.container').firstChild.nextSibling);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

function parseJSON(str) {
    try {
        return str ? JSON.parse(str) : {};
    } catch {
        return {};
    }
}

// Integration Functions
async function checkIntegrationStatus() {
    // Check Supabase status
    updateIntegrationStatus('supabase', 'checking');
    try {
        const response = await fetch('/api/sync/supabase/companies', { method: 'POST' });
        if (response.ok) {
            updateIntegrationStatus('supabase', 'connected');
        } else {
            updateIntegrationStatus('supabase', 'disconnected');
        }
    } catch {
        updateIntegrationStatus('supabase', 'disconnected');
    }

    // Check Notion status (simplified check)
    updateIntegrationStatus('notion', process.env.NOTION_API_KEY ? 'connected' : 'disconnected');
    
    // Check Google Drive status
    updateIntegrationStatus('google', 'checking');
    try {
        const response = await fetch('/api/drive/files');
        if (response.ok) {
            updateIntegrationStatus('google', 'connected');
            document.getElementById('auth-google-btn').style.display = 'none';
            document.getElementById('sync-drive-btn').style.display = 'block';
            document.getElementById('drive-files').style.display = 'block';
        } else {
            updateIntegrationStatus('google', 'disconnected');
        }
    } catch {
        updateIntegrationStatus('google', 'disconnected');
    }
}

function updateIntegrationStatus(service, status) {
    const statusElement = document.getElementById(`${service}-status`);
    const indicator = statusElement.querySelector('.status-indicator');
    const text = statusElement.querySelector('.status-text');
    
    indicator.setAttribute('data-status', status);
    
    switch(status) {
        case 'connected':
            indicator.textContent = '✓';
            text.textContent = 'Connected';
            break;
        case 'disconnected':
            indicator.textContent = '✗';
            text.textContent = 'Not connected';
            break;
        case 'checking':
            indicator.textContent = '⟳';
            text.textContent = 'Checking connection...';
            break;
    }
}

async function syncToSupabase() {
    showMessage('Syncing to Supabase...', 'info');
    
    try {
        // Sync companies
        for (const company of companies) {
            await fetch('/api/sync/all', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'company',
                    data: company
                })
            });
        }
        
        // Sync novels
        for (const novel of novels) {
            await fetch('/api/sync/all', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'novel',
                    data: novel
                })
            });
        }
        
        showSuccess('Successfully synced to Supabase!');
    } catch (error) {
        showError('Error syncing to Supabase: ' + error.message);
    }
}

async function syncToNotion() {
    showMessage('Syncing to Notion...', 'info');
    
    try {
        // Get all credit memos
        const memoResponse = await fetch('/api/credit-memos');
        const memos = await memoResponse.json();
        
        // Sync each memo to Notion
        for (const memo of memos) {
            const company = companies.find(c => c.id === memo.company_id);
            await fetch('/api/sync/notion/credit-memo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    memoData: {
                        ...memo,
                        company_name: company?.name || 'Unknown',
                        industry: company?.industry || 'Unknown'
                    }
                })
            });
        }
        
        // Sync novels to Notion
        for (const novel of novels) {
            await fetch('/api/sync/notion/novel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ novelData: novel })
            });
        }
        
        showSuccess('Successfully synced to Notion!');
    } catch (error) {
        showError('Error syncing to Notion: ' + error.message);
    }
}

async function authenticateGoogle() {
    try {
        const response = await fetch('/api/auth/google');
        const data = await response.json();
        
        if (data.authUrl) {
            window.location.href = data.authUrl;
        } else {
            showError('Could not generate Google authentication URL');
        }
    } catch (error) {
        showError('Error authenticating with Google: ' + error.message);
    }
}

async function syncToGoogleDrive() {
    showMessage('Syncing to Google Drive...', 'info');
    
    try {
        // Create financial spreadsheets for companies
        for (const company of companies) {
            await fetch('/api/drive/create-financial-sheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    companyData: company,
                    financialData: {} // Would be populated with actual financial data
                })
            });
        }
        
        // Create documents for novel chapters
        const chaptersResponse = await fetch(`/api/novels/${currentNovelId}/chapters`);
        const chapters = await chaptersResponse.json();
        
        for (const chapter of chapters) {
            await fetch('/api/drive/create-chapter-doc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chapterData: chapter })
            });
        }
        
        showSuccess('Successfully synced to Google Drive!');
        loadGoogleDriveFiles();
    } catch (error) {
        showError('Error syncing to Google Drive: ' + error.message);
    }
}

async function loadGoogleDriveFiles() {
    try {
        const response = await fetch('/api/drive/files');
        if (response.ok) {
            const data = await response.json();
            renderDriveFiles(data.files);
        }
    } catch (error) {
        console.log('Could not load Google Drive files');
    }
}

function renderDriveFiles(files) {
    const container = document.getElementById('drive-files-list');
    if (!files || files.length === 0) {
        container.innerHTML = '<p>No files found</p>';
        return;
    }
    
    container.innerHTML = files.map(file => `
        <div class="file-item">
            <span class="file-icon">${getFileIcon(file.mimeType)}</span>
            <span class="file-name">${file.name}</span>
            <a href="${file.webViewLink}" target="_blank" class="file-link">Open</a>
        </div>
    `).join('');
}

function getFileIcon(mimeType) {
    if (mimeType.includes('document')) return '📄';
    if (mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('folder')) return '📁';
    return '📎';
}

async function saveSyncSettings(e) {
    e.preventDefault();
    
    const settings = {
        autoSyncSupabase: document.getElementById('auto-sync-supabase').checked,
        autoSyncNotion: document.getElementById('auto-sync-notion').checked,
        autoSyncDrive: document.getElementById('auto-sync-drive').checked,
        syncInterval: document.getElementById('sync-interval').value
    };
    
    localStorage.setItem('syncSettings', JSON.stringify(settings));
    
    // Set up auto-sync if enabled
    if (settings.syncInterval !== 'manual') {
        const intervalMinutes = parseInt(settings.syncInterval);
        setInterval(() => {
            if (settings.autoSyncSupabase) syncToSupabase();
            if (settings.autoSyncNotion) syncToNotion();
            if (settings.autoSyncDrive) syncToGoogleDrive();
        }, intervalMinutes * 60 * 1000);
    }
    
    showSuccess('Sync settings saved!');
}

function showMessage(message, type) {
    const existingMessage = document.querySelector('.success-message, .error-message, .info-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'success' ? 'success-message' : type === 'error' ? 'error-message' : 'info-message';
    messageDiv.textContent = message;
    
    document.querySelector('.container').insertBefore(messageDiv, document.querySelector('.container').firstChild.nextSibling);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}