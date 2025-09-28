const { supabaseAdmin } = require('../config/supabase');
const { notionHelpers } = require('../config/notion');
const { googleDriveHelpers } = require('../config/googleDrive');

class SyncService {
    constructor() {
        this.services = ['notion', 'google_drive'];
    }

    // Log sync operation
    async logSync(userId, entityType, entityId, service, action, status, externalId = null, errorMessage = null) {
        try {
            const { error } = await supabaseAdmin
                .from('sync_logs')
                .insert({
                    user_id: userId,
                    entity_type: entityType,
                    entity_id: entityId,
                    service: service,
                    action: action,
                    status: status,
                    external_id: externalId,
                    error_message: errorMessage
                });

            if (error) {
                console.error('Error logging sync:', error);
            }
        } catch (error) {
            console.error('Error in logSync:', error);
        }
    }

    // Sync company to external services
    async syncCompany(userId, companyData, action = 'create') {
        const results = {};

        // Sync to Notion
        try {
            await this.logSync(userId, 'company', companyData.id, 'notion', action, 'pending');
            
            const notionResult = await notionHelpers.createCompany(companyData.name, companyData.industry);
            
            // Update company with Notion page ID
            await supabaseAdmin
                .from('companies')
                .update({ notion_page_id: notionResult.id })
                .eq('id', companyData.id);

            await this.logSync(userId, 'company', companyData.id, 'notion', action, 'success', notionResult.id);
            results.notion = { success: true, id: notionResult.id };
        } catch (error) {
            await this.logSync(userId, 'company', companyData.id, 'notion', action, 'failed', null, error.message);
            results.notion = { success: false, error: error.message };
        }

        // Create Google Drive folder for company documents
        try {
            await this.logSync(userId, 'company', companyData.id, 'google_drive', action, 'pending');
            
            // Set user's Google tokens if available
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('google_tokens')
                .eq('id', userId)
                .single();

            if (profile?.google_tokens) {
                googleDriveHelpers.setCredentials(profile.google_tokens);
                
                const folderName = `${companyData.name}_Financial_Documents`;
                const driveFolder = await googleDriveHelpers.createFolder(folderName);
                
                // Update company with Google Drive folder ID
                await supabaseAdmin
                    .from('companies')
                    .update({ google_drive_folder_id: driveFolder.id })
                    .eq('id', companyData.id);

                await this.logSync(userId, 'company', companyData.id, 'google_drive', action, 'success', driveFolder.id);
                results.google_drive = { success: true, id: driveFolder.id };
            } else {
                results.google_drive = { success: false, error: 'Google tokens not available' };
            }
        } catch (error) {
            await this.logSync(userId, 'company', companyData.id, 'google_drive', action, 'failed', null, error.message);
            results.google_drive = { success: false, error: error.message };
        }

        return results;
    }

    // Sync novel to external services
    async syncNovel(userId, novelData, action = 'create') {
        const results = {};

        // Sync to Notion
        try {
            await this.logSync(userId, 'novel', novelData.id, 'notion', action, 'pending');
            
            const notionResult = await notionHelpers.createNovel(
                novelData.title,
                novelData.description,
                novelData.pov_style,
                novelData.tense,
                novelData.target_chapters,
                novelData.target_beats
            );
            
            // Update novel with Notion page ID
            await supabaseAdmin
                .from('novels')
                .update({ notion_page_id: notionResult.id })
                .eq('id', novelData.id);

            await this.logSync(userId, 'novel', novelData.id, 'notion', action, 'success', notionResult.id);
            results.notion = { success: true, id: notionResult.id };
        } catch (error) {
            await this.logSync(userId, 'novel', novelData.id, 'notion', action, 'failed', null, error.message);
            results.notion = { success: false, error: error.message };
        }

        // Create Google Drive folder for novel manuscripts
        try {
            await this.logSync(userId, 'novel', novelData.id, 'google_drive', action, 'pending');
            
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('google_tokens')
                .eq('id', userId)
                .single();

            if (profile?.google_tokens) {
                googleDriveHelpers.setCredentials(profile.google_tokens);
                
                const folderName = `${novelData.title}_Manuscripts`;
                const driveFolder = await googleDriveHelpers.createFolder(folderName);
                
                // Update novel with Google Drive folder ID
                await supabaseAdmin
                    .from('novels')
                    .update({ google_drive_folder_id: driveFolder.id })
                    .eq('id', novelData.id);

                await this.logSync(userId, 'novel', novelData.id, 'google_drive', action, 'success', driveFolder.id);
                results.google_drive = { success: true, id: driveFolder.id };
            } else {
                results.google_drive = { success: false, error: 'Google tokens not available' };
            }
        } catch (error) {
            await this.logSync(userId, 'novel', novelData.id, 'google_drive', action, 'failed', null, error.message);
            results.google_drive = { success: false, error: error.message };
        }

        return results;
    }

    // Sync credit memo to external services
    async syncCreditMemo(userId, memoData, companyName, action = 'create') {
        const results = {};

        // Sync to Notion
        try {
            await this.logSync(userId, 'credit_memo', memoData.id, 'notion', action, 'pending');
            
            const notionResult = await notionHelpers.createCreditMemo(
                companyName,
                memoData.memo_type,
                memoData.title,
                memoData.content,
                memoData.financial_metrics
            );
            
            // Update memo with Notion page ID
            await supabaseAdmin
                .from('credit_memos')
                .update({ notion_page_id: notionResult.id })
                .eq('id', memoData.id);

            await this.logSync(userId, 'credit_memo', memoData.id, 'notion', action, 'success', notionResult.id);
            results.notion = { success: true, id: notionResult.id };
        } catch (error) {
            await this.logSync(userId, 'credit_memo', memoData.id, 'notion', action, 'failed', null, error.message);
            results.notion = { success: false, error: error.message };
        }

        return results;
    }

    // Backup chapter content to Google Drive
    async backupChapter(userId, chapterData, novelTitle) {
        try {
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('google_tokens')
                .eq('id', userId)
                .single();

            if (!profile?.google_tokens) {
                throw new Error('Google tokens not available');
            }

            googleDriveHelpers.setCredentials(profile.google_tokens);
            
            const content = `Chapter ${chapterData.chapter_number}: ${chapterData.title || 'Untitled'}\n\n${chapterData.content || chapterData.summary || 'No content yet'}`;
            
            const backupResult = await googleDriveHelpers.uploadNovelBackup(
                `${novelTitle}_Chapter_${chapterData.chapter_number}`,
                content
            );

            // Update chapter with backup ID
            await supabaseAdmin
                .from('chapters')
                .update({ google_drive_backup_id: backupResult.id })
                .eq('id', chapterData.id);

            return { success: true, id: backupResult.id };
        } catch (error) {
            console.error('Error backing up chapter:', error);
            return { success: false, error: error.message };
        }
    }

    // Get sync status for an entity
    async getSyncStatus(userId, entityType, entityId) {
        try {
            const { data, error } = await supabaseAdmin
                .from('sync_logs')
                .select('service, action, status, external_id, error_message, created_at')
                .eq('user_id', userId)
                .eq('entity_type', entityType)
                .eq('entity_id', entityId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Group by service to get latest status
            const statusByService = {};
            data.forEach(log => {
                if (!statusByService[log.service]) {
                    statusByService[log.service] = log;
                }
            });

            return statusByService;
        } catch (error) {
            console.error('Error getting sync status:', error);
            return {};
        }
    }
}

module.exports = new SyncService();