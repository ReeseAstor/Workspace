const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// OAuth2 client setup
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

// Google Drive API instance
const drive = google.drive({ version: 'v3', auth: oauth2Client });

const googleDriveHelpers = {
    // Set credentials from tokens
    setCredentials(tokens) {
        oauth2Client.setCredentials(tokens);
    },

    // Generate OAuth URL for authentication
    getAuthUrl() {
        const scopes = [
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/drive.metadata.readonly'
        ];

        return oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
        });
    },

    // Exchange authorization code for tokens
    async getTokens(code) {
        const { tokens } = await oauth2Client.getToken(code);
        return tokens;
    },

    // Upload file to Google Drive
    async uploadFile(filePath, fileName, mimeType, folderId = null) {
        try {
            const fileMetadata = {
                name: fileName,
                parents: folderId ? [folderId] : [process.env.GOOGLE_DRIVE_FOLDER_ID]
            };

            const media = {
                mimeType: mimeType,
                body: fs.createReadStream(filePath),
            };

            const response = await drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id, name, webViewLink, webContentLink',
            });

            return response.data;
        } catch (error) {
            console.error('Error uploading file to Google Drive:', error);
            throw error;
        }
    },

    // Create folder in Google Drive
    async createFolder(folderName, parentFolderId = null) {
        try {
            const fileMetadata = {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: parentFolderId ? [parentFolderId] : [process.env.GOOGLE_DRIVE_FOLDER_ID]
            };

            const response = await drive.files.create({
                resource: fileMetadata,
                fields: 'id, name',
            });

            return response.data;
        } catch (error) {
            console.error('Error creating folder in Google Drive:', error);
            throw error;
        }
    },

    // List files in a folder
    async listFiles(folderId = null) {
        try {
            const query = folderId 
                ? `'${folderId}' in parents and trashed=false`
                : `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed=false`;

            const response = await drive.files.list({
                q: query,
                fields: 'files(id, name, mimeType, createdTime, webViewLink)',
                orderBy: 'createdTime desc'
            });

            return response.data.files;
        } catch (error) {
            console.error('Error listing files from Google Drive:', error);
            throw error;
        }
    },

    // Upload financial document with metadata
    async uploadFinancialDocument(filePath, originalName, companyName, documentType) {
        try {
            // Create company folder if it doesn't exist
            const companyFolderName = `${companyName}_Financial_Documents`;
            let companyFolderId;

            // Check if company folder exists
            const existingFolders = await this.listFiles();
            const existingFolder = existingFolders.find(file => 
                file.name === companyFolderName && 
                file.mimeType === 'application/vnd.google-apps.folder'
            );

            if (existingFolder) {
                companyFolderId = existingFolder.id;
            } else {
                const newFolder = await this.createFolder(companyFolderName);
                companyFolderId = newFolder.id;
            }

            // Upload file with timestamp
            const timestamp = new Date().toISOString().split('T')[0];
            const fileName = `${timestamp}_${documentType}_${originalName}`;
            const mimeType = this.getMimeType(originalName);

            const uploadedFile = await this.uploadFile(filePath, fileName, mimeType, companyFolderId);
            
            return {
                ...uploadedFile,
                folderId: companyFolderId,
                companyName,
                documentType
            };
        } catch (error) {
            console.error('Error uploading financial document:', error);
            throw error;
        }
    },

    // Upload novel manuscript backup
    async uploadNovelBackup(novelTitle, content, format = 'txt') {
        try {
            // Create novels folder if it doesn't exist
            const novelsFolderName = 'Novel_Manuscripts';
            let novelsFolderId;

            const existingFolders = await this.listFiles();
            const existingFolder = existingFolders.find(file => 
                file.name === novelsFolderName && 
                file.mimeType === 'application/vnd.google-apps.folder'
            );

            if (existingFolder) {
                novelsFolderId = existingFolder.id;
            } else {
                const newFolder = await this.createFolder(novelsFolderName);
                novelsFolderId = newFolder.id;
            }

            // Create temporary file
            const timestamp = new Date().toISOString().split('T')[0];
            const fileName = `${novelTitle}_backup_${timestamp}.${format}`;
            const tempFilePath = path.join(__dirname, '..', 'temp', fileName);

            // Ensure temp directory exists
            const tempDir = path.dirname(tempFilePath);
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            // Write content to temp file
            fs.writeFileSync(tempFilePath, content);

            // Upload to Google Drive
            const mimeType = format === 'txt' ? 'text/plain' : 'application/vnd.google-apps.document';
            const uploadedFile = await this.uploadFile(tempFilePath, fileName, mimeType, novelsFolderId);

            // Clean up temp file
            fs.unlinkSync(tempFilePath);

            return uploadedFile;
        } catch (error) {
            console.error('Error uploading novel backup:', error);
            throw error;
        }
    },

    // Helper to determine MIME type
    getMimeType(filename) {
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.txt': 'text/plain',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }
};

module.exports = {
    oauth2Client,
    drive,
    googleDriveHelpers
};