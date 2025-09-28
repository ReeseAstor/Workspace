const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class GoogleDriveService {
    constructor() {
        this.drive = null;
        this.docs = null;
        this.sheets = null;
        this.oauth2Client = null;
        this.initializeClient();
    }

    initializeClient() {
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
            console.log('Google Drive credentials not configured. Skipping Google Drive initialization.');
            return;
        }

        try {
            this.oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
            );

            // Initialize Google APIs
            this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
            this.docs = google.docs({ version: 'v1', auth: this.oauth2Client });
            this.sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });

            console.log('Google Drive client initialized successfully');
        } catch (error) {
            console.error('Error initializing Google Drive client:', error);
        }
    }

    // Generate authentication URL
    getAuthUrl() {
        if (!this.oauth2Client) return null;

        const scopes = [
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/documents',
            'https://www.googleapis.com/auth/spreadsheets'
        ];

        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent'
        });
    }

    // Exchange authorization code for tokens
    async getTokens(code) {
        if (!this.oauth2Client) return null;

        try {
            const { tokens } = await this.oauth2Client.getToken(code);
            this.oauth2Client.setCredentials(tokens);
            
            // Save tokens to file for persistence
            await this.saveTokens(tokens);
            
            return tokens;
        } catch (error) {
            console.error('Error getting tokens:', error);
            return null;
        }
    }

    // Save tokens to file
    async saveTokens(tokens) {
        try {
            const tokenPath = path.join(__dirname, '..', 'token.json');
            await fs.writeFile(tokenPath, JSON.stringify(tokens, null, 2));
            console.log('Tokens saved successfully');
        } catch (error) {
            console.error('Error saving tokens:', error);
        }
    }

    // Load tokens from file
    async loadTokens() {
        try {
            const tokenPath = path.join(__dirname, '..', 'token.json');
            const tokens = JSON.parse(await fs.readFile(tokenPath, 'utf8'));
            this.oauth2Client.setCredentials(tokens);
            console.log('Tokens loaded successfully');
            return true;
        } catch (error) {
            console.log('No saved tokens found');
            return false;
        }
    }

    // Create a folder in Google Drive
    async createFolder(folderName, parentFolderId = null) {
        if (!this.drive) return null;

        const fileMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder'
        };

        if (parentFolderId) {
            fileMetadata.parents = [parentFolderId];
        } else if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
            fileMetadata.parents = [process.env.GOOGLE_DRIVE_FOLDER_ID];
        }

        try {
            const response = await this.drive.files.create({
                resource: fileMetadata,
                fields: 'id, name, webViewLink'
            });

            return response.data;
        } catch (error) {
            console.error('Error creating folder:', error);
            return null;
        }
    }

    // Upload a file to Google Drive
    async uploadFile(filePath, fileName, mimeType, folderId = null) {
        if (!this.drive) return null;

        const fileMetadata = {
            name: fileName
        };

        if (folderId) {
            fileMetadata.parents = [folderId];
        } else if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
            fileMetadata.parents = [process.env.GOOGLE_DRIVE_FOLDER_ID];
        }

        const media = {
            mimeType: mimeType,
            body: await fs.readFile(filePath)
        };

        try {
            const response = await this.drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id, name, webViewLink'
            });

            return response.data;
        } catch (error) {
            console.error('Error uploading file:', error);
            return null;
        }
    }

    // Create a Google Doc for a novel chapter
    async createChapterDocument(chapterData, folderId = null) {
        if (!this.docs || !this.drive) return null;

        try {
            // Create the document
            const createResponse = await this.docs.documents.create({
                requestBody: {
                    title: `Chapter ${chapterData.chapter_number}: ${chapterData.title}`
                }
            });

            const documentId = createResponse.data.documentId;

            // Add content to the document
            const requests = [
                {
                    insertText: {
                        location: { index: 1 },
                        text: `Chapter ${chapterData.chapter_number}: ${chapterData.title}\n\n`
                    }
                },
                {
                    updateParagraphStyle: {
                        range: {
                            startIndex: 1,
                            endIndex: `Chapter ${chapterData.chapter_number}: ${chapterData.title}`.length + 1
                        },
                        paragraphStyle: {
                            namedStyleType: 'HEADING_1'
                        },
                        fields: 'namedStyleType'
                    }
                },
                {
                    insertText: {
                        location: { index: `Chapter ${chapterData.chapter_number}: ${chapterData.title}\n\n`.length + 1 },
                        text: `POV: ${chapterData.pov_character}\n\n${chapterData.summary || 'Chapter content goes here...'}`
                    }
                }
            ];

            await this.docs.documents.batchUpdate({
                documentId: documentId,
                requestBody: { requests }
            });

            // Move to folder if specified
            if (folderId || process.env.GOOGLE_DRIVE_FOLDER_ID) {
                await this.drive.files.update({
                    fileId: documentId,
                    addParents: folderId || process.env.GOOGLE_DRIVE_FOLDER_ID,
                    fields: 'id, parents'
                });
            }

            // Get the document link
            const fileResponse = await this.drive.files.get({
                fileId: documentId,
                fields: 'webViewLink'
            });

            return {
                id: documentId,
                webViewLink: fileResponse.data.webViewLink
            };
        } catch (error) {
            console.error('Error creating chapter document:', error);
            return null;
        }
    }

    // Create a Google Sheet for financial data
    async createFinancialSpreadsheet(companyData, financialData) {
        if (!this.sheets || !this.drive) return null;

        try {
            // Create the spreadsheet
            const createResponse = await this.sheets.spreadsheets.create({
                requestBody: {
                    properties: {
                        title: `${companyData.name} - Financial Analysis`
                    },
                    sheets: [
                        {
                            properties: {
                                title: 'Overview'
                            }
                        },
                        {
                            properties: {
                                title: 'Financial Statements'
                            }
                        },
                        {
                            properties: {
                                title: 'Ratios'
                            }
                        }
                    ]
                }
            });

            const spreadsheetId = createResponse.data.spreadsheetId;

            // Add data to the overview sheet
            const overviewData = [
                ['Company Information'],
                ['Name', companyData.name],
                ['Industry', companyData.industry || 'N/A'],
                ['Analysis Date', new Date().toLocaleDateString()],
                [''],
                ['Key Metrics'],
                ['Revenue', financialData.revenue || 'N/A'],
                ['EBITDA', financialData.ebitda || 'N/A'],
                ['Net Income', financialData.netIncome || 'N/A'],
                ['Total Assets', financialData.totalAssets || 'N/A'],
                ['Total Liabilities', financialData.totalLiabilities || 'N/A']
            ];

            await this.sheets.spreadsheets.values.update({
                spreadsheetId: spreadsheetId,
                range: 'Overview!A1',
                valueInputOption: 'RAW',
                requestBody: {
                    values: overviewData
                }
            });

            // Move to folder if specified
            if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
                await this.drive.files.update({
                    fileId: spreadsheetId,
                    addParents: process.env.GOOGLE_DRIVE_FOLDER_ID,
                    fields: 'id, parents'
                });
            }

            // Get the spreadsheet link
            const fileResponse = await this.drive.files.get({
                fileId: spreadsheetId,
                fields: 'webViewLink'
            });

            return {
                id: spreadsheetId,
                webViewLink: fileResponse.data.webViewLink
            };
        } catch (error) {
            console.error('Error creating financial spreadsheet:', error);
            return null;
        }
    }

    // List files in a folder
    async listFiles(folderId = null) {
        if (!this.drive) return [];

        try {
            const query = folderId 
                ? `'${folderId}' in parents and trashed = false`
                : `'${process.env.GOOGLE_DRIVE_FOLDER_ID || 'root'}' in parents and trashed = false`;

            const response = await this.drive.files.list({
                q: query,
                fields: 'files(id, name, mimeType, webViewLink, createdTime, modifiedTime)',
                orderBy: 'modifiedTime desc'
            });

            return response.data.files;
        } catch (error) {
            console.error('Error listing files:', error);
            return [];
        }
    }

    // Download a file from Google Drive
    async downloadFile(fileId, destPath) {
        if (!this.drive) return false;

        try {
            const response = await this.drive.files.get(
                { fileId: fileId, alt: 'media' },
                { responseType: 'stream' }
            );

            const dest = fs.createWriteStream(destPath);
            response.data.pipe(dest);

            return new Promise((resolve, reject) => {
                dest.on('finish', () => resolve(true));
                dest.on('error', reject);
            });
        } catch (error) {
            console.error('Error downloading file:', error);
            return false;
        }
    }

    // Delete a file from Google Drive
    async deleteFile(fileId) {
        if (!this.drive) return false;

        try {
            await this.drive.files.delete({ fileId: fileId });
            return true;
        } catch (error) {
            console.error('Error deleting file:', error);
            return false;
        }
    }

    // Share a file
    async shareFile(fileId, email, role = 'reader') {
        if (!this.drive) return false;

        try {
            await this.drive.permissions.create({
                fileId: fileId,
                requestBody: {
                    type: 'user',
                    role: role,
                    emailAddress: email
                }
            });

            return true;
        } catch (error) {
            console.error('Error sharing file:', error);
            return false;
        }
    }
}

module.exports = new GoogleDriveService();