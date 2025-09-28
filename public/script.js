// Global state
let currentNovelId = null;
let companies = [];
let novels = [];

// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    // Navigation
    document.getElementById('credit-tab').addEventListener('click', () => switchTab('credit'));
    document.getElementById('novel-tab').addEventListener('click', () => switchTab('novel'));

    // Credit Analysis Forms
    document.getElementById('company-form').addEventListener('submit', handleCompanySubmit);
    document.getElementById('upload-form').addEventListener('submit', handleFileUpload);
    document.getElementById('memo-form').addEventListener('submit', handleMemoSubmit);

    // Novel Planning Forms
    document.getElementById('novel-form').addEventListener('submit', handleNovelSubmit);
    document.getElementById('chapter-form').addEventListener('submit', handleChapterSubmit);
    document.getElementById('beat-form').addEventListener('submit', handleBeatSubmit);

    // Load initial data
    loadCompanies();
    loadNovels();
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
    }
}

// Credit Analysis Functions
async function loadCompanies() {
    try {
        const response = await authenticatedFetch('/api/companies');
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
            ${company.notion_page_id ? '<span class="sync-badge notion">📝 Notion</span>' : ''}
            ${company.google_drive_folder_id ? '<span class="sync-badge drive">📁 Drive</span>' : ''}
            <button onclick="showSyncStatus('company', '${company.id}')" class="sync-btn">Sync Status</button>
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
        const response = await authenticatedFetch('/api/companies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, industry })
        });

        if (response.ok) {
            const result = await response.json();
            showSuccess(result.message || 'Company added successfully!');
            document.getElementById('company-form').reset();
            loadCompanies();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to add company');
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
        const response = await authenticatedFetch('/api/upload-financial', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const result = await response.json();
            const message = result.google_drive_backup ? 
                'Financial document uploaded, processed, and backed up to Google Drive!' :
                'Financial document uploaded and processed successfully!';
            showSuccess(message);
            document.getElementById('upload-form').reset();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to upload document');
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
        const response = await authenticatedFetch('/api/credit-memos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(memoData)
        });

        if (response.ok) {
            const result = await response.json();
            showSuccess(result.message || 'Credit memo created successfully!');
            document.getElementById('memo-form').reset();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create credit memo');
        }
    } catch (error) {
        showError('Error creating credit memo: ' + error.message);
    }
}

// Novel Planning Functions
async function loadNovels() {
    try {
        const response = await authenticatedFetch('/api/novels');
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
            ${novel.notion_page_id ? '<span class="sync-badge notion">📝 Notion</span>' : ''}
            ${novel.google_drive_folder_id ? '<span class="sync-badge drive">📁 Drive</span>' : ''}
            <button onclick="selectNovel('${novel.id}')">Work on This Novel</button>
            <button onclick="showSyncStatus('novel', '${novel.id}')" class="sync-btn">Sync Status</button>
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
        const response = await authenticatedFetch(`/api/novels/${novelId}/chapters`);
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
            ${chapter.google_drive_backup_id ? '<span class="sync-badge drive">📁 Backed up</span>' : ''}
            ${chapter.word_count > 0 ? `<p>Word count: ${chapter.word_count}</p>` : ''}
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
        const response = await authenticatedFetch(`/api/novels/${novelId}/beats`);
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
        const response = await authenticatedFetch('/api/novels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novelData)
        });

        if (response.ok) {
            const result = await response.json();
            showSuccess(result.message || 'Novel project created successfully!');
            document.getElementById('novel-form').reset();
            loadNovels();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create novel project');
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
        const response = await authenticatedFetch('/api/chapters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(chapterData)
        });

        if (response.ok) {
            const result = await response.json();
            showSuccess(result.message || 'Chapter added successfully!');
            document.getElementById('chapter-form').reset();
            loadChapters(currentNovelId);
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to add chapter');
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
        const response = await authenticatedFetch('/api/beats', {
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

// Sync status functions
async function showSyncStatus(entityType, entityId) {
    try {
        const response = await authenticatedFetch(`/api/sync-status/${entityType}/${entityId}`);
        const status = await response.json();
        
        let statusHtml = `<h3>Sync Status for ${entityType}</h3>`;
        
        Object.keys(status).forEach(service => {
            const serviceStatus = status[service];
            const statusIcon = serviceStatus.status === 'success' ? '✅' : 
                             serviceStatus.status === 'failed' ? '❌' : '⏳';
            
            statusHtml += `
                <div class="sync-status-item">
                    <strong>${service}:</strong> ${statusIcon} ${serviceStatus.status}
                    ${serviceStatus.error_message ? `<br><small>Error: ${serviceStatus.error_message}</small>` : ''}
                    <br><small>Last updated: ${new Date(serviceStatus.created_at).toLocaleString()}</small>
                </div>
            `;
        });
        
        statusHtml += `<button onclick="manualSync('${entityType}', '${entityId}')">Force Sync</button>`;
        statusHtml += `<button onclick="hideSyncStatus()">Close</button>`;
        
        showModal('Sync Status', statusHtml);
    } catch (error) {
        showError('Failed to load sync status: ' + error.message);
    }
}

async function manualSync(entityType, entityId) {
    try {
        const response = await authenticatedFetch(`/api/sync/${entityType}/${entityId}`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showSuccess(result.message || 'Manual sync completed');
            setTimeout(() => showSyncStatus(entityType, entityId), 1000); // Refresh status
        } else {
            throw new Error(result.error || 'Manual sync failed');
        }
    } catch (error) {
        showError('Manual sync failed: ' + error.message);
    }
}

function showModal(title, content) {
    const modal = document.getElementById('sync-modal') || createSyncModal();
    document.getElementById('sync-modal-title').textContent = title;
    document.getElementById('sync-modal-content').innerHTML = content;
    modal.style.display = 'block';
}

function hideSyncStatus() {
    const modal = document.getElementById('sync-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function createSyncModal() {
    const modal = document.createElement('div');
    modal.id = 'sync-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2 id="sync-modal-title"></h2>
            <div id="sync-modal-content"></div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}