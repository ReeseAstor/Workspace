const { google } = require('googleapis');
const { googleConfig } = require('../config/integrations');
const fs = require('fs');
const path = require('path');

class GoogleDriveService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      googleConfig.clientId,
      googleConfig.clientSecret,
      googleConfig.redirectUri
    );

    if (googleConfig.refreshToken) {
      this.oauth2Client.setCredentials({
        refresh_token: googleConfig.refreshToken
      });
    }

    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  // Upload file to Google Drive
  async uploadFile(filePath, fileName, folderId = null) {
    try {
      const fileMetadata = {
        name: fileName,
        parents: folderId ? [folderId] : []
      };

      const media = {
        mimeType: this.getMimeType(fileName),
        body: fs.createReadStream(filePath)
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id,name,webViewLink,webContentLink'
      });

      return response.data;
    } catch (error) {
      console.error('Google Drive upload error:', error);
      throw error;
    }
  }

  // Create a folder
  async createFolder(folderName, parentFolderId = null) {
    try {
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentFolderId ? [parentFolderId] : []
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id,name,webViewLink'
      });

      return response.data;
    } catch (error) {
      console.error('Google Drive folder creation error:', error);
      throw error;
    }
  }

  // Get or create workspace folder structure
  async setupWorkspaceFolders() {
    try {
      // Create main workspace folder
      const workspaceFolder = await this.createFolder('Commodities Credit Workspace');
      
      // Create subfolders
      const creditFolder = await this.createFolder('Credit Analysis', workspaceFolder.id);
      const novelFolder = await this.createFolder('Novel Planning', workspaceFolder.id);
      const documentsFolder = await this.createFolder('Documents', workspaceFolder.id);

      // Create company-specific folders
      const companiesFolder = await this.createFolder('Companies', creditFolder.id);
      const memosFolder = await this.createFolder('Credit Memos', creditFolder.id);

      return {
        workspace: workspaceFolder,
        credit: creditFolder,
        novel: novelFolder,
        documents: documentsFolder,
        companies: companiesFolder,
        memos: memosFolder
      };
    } catch (error) {
      console.error('Error setting up workspace folders:', error);
      throw error;
    }
  }

  // Upload financial document
  async uploadFinancialDocument(filePath, fileName, companyName) {
    try {
      // Get or create company folder
      const companyFolder = await this.getOrCreateCompanyFolder(companyName);
      
      // Upload file
      const fileData = await this.uploadFile(filePath, fileName, companyFolder.id);
      
      return {
        fileId: fileData.id,
        fileName: fileData.name,
        webViewLink: fileData.webViewLink,
        webContentLink: fileData.webContentLink,
        folderId: companyFolder.id
      };
    } catch (error) {
      console.error('Error uploading financial document:', error);
      throw error;
    }
  }

  // Get or create company folder
  async getOrCreateCompanyFolder(companyName) {
    try {
      // Search for existing folder
      const response = await this.drive.files.list({
        q: `name='${companyName}' and mimeType='application/vnd.google-apps.folder'`,
        fields: 'files(id,name)'
      });

      if (response.data.files.length > 0) {
        return response.data.files[0];
      }

      // Create new folder if not found
      const companiesFolder = await this.getCompaniesFolder();
      return await this.createFolder(companyName, companiesFolder.id);
    } catch (error) {
      console.error('Error getting/creating company folder:', error);
      throw error;
    }
  }

  // Get companies folder
  async getCompaniesFolder() {
    try {
      const response = await this.drive.files.list({
        q: "name='Companies' and mimeType='application/vnd.google-apps.folder'",
        fields: 'files(id,name)'
      });

      if (response.data.files.length > 0) {
        return response.data.files[0];
      }

      // If not found, create the entire folder structure
      const folders = await this.setupWorkspaceFolders();
      return folders.companies;
    } catch (error) {
      console.error('Error getting companies folder:', error);
      throw error;
    }
  }

  // Upload novel document
  async uploadNovelDocument(filePath, fileName, novelTitle) {
    try {
      // Get or create novel folder
      const novelFolder = await this.getOrCreateNovelFolder(novelTitle);
      
      // Upload file
      const fileData = await this.uploadFile(filePath, fileName, novelFolder.id);
      
      return {
        fileId: fileData.id,
        fileName: fileData.name,
        webViewLink: fileData.webViewLink,
        webContentLink: fileData.webContentLink,
        folderId: novelFolder.id
      };
    } catch (error) {
      console.error('Error uploading novel document:', error);
      throw error;
    }
  }

  // Get or create novel folder
  async getOrCreateNovelFolder(novelTitle) {
    try {
      // Search for existing folder
      const response = await this.drive.files.list({
        q: `name='${novelTitle}' and mimeType='application/vnd.google-apps.folder'`,
        fields: 'files(id,name)'
      });

      if (response.data.files.length > 0) {
        return response.data.files[0];
      }

      // Create new folder if not found
      const novelFolder = await this.getNovelFolder();
      return await this.createFolder(novelTitle, novelFolder.id);
    } catch (error) {
      console.error('Error getting/creating novel folder:', error);
      throw error;
    }
  }

  // Get novel folder
  async getNovelFolder() {
    try {
      const response = await this.drive.files.list({
        q: "name='Novel Planning' and mimeType='application/vnd.google-apps.folder'",
        fields: 'files(id,name)'
      });

      if (response.data.files.length > 0) {
        return response.data.files[0];
      }

      // If not found, create the entire folder structure
      const folders = await this.setupWorkspaceFolders();
      return folders.novel;
    } catch (error) {
      console.error('Error getting novel folder:', error);
      throw error;
    }
  }

  // Get file by ID
  async getFile(fileId) {
    try {
      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'id,name,webViewLink,webContentLink,createdTime,modifiedTime'
      });

      return response.data;
    } catch (error) {
      console.error('Error getting file:', error);
      throw error;
    }
  }

  // List files in folder
  async listFiles(folderId) {
    try {
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents`,
        fields: 'files(id,name,webViewLink,webContentLink,createdTime,modifiedTime)'
      });

      return response.data.files;
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  // Delete file
  async deleteFile(fileId) {
    try {
      await this.drive.files.delete({
        fileId: fileId
      });

      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  // Get MIME type based on file extension
  getMimeType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif'
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  // Test connection
  async testConnection() {
    try {
      await this.drive.about.get({
        fields: 'user'
      });
      console.log('Google Drive connected successfully');
      return true;
    } catch (error) {
      console.error('Google Drive connection error:', error);
      return false;
    }
  }

  // Get authorization URL
  getAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.metadata.readonly'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes
    });
  }

  // Exchange code for tokens
  async getTokens(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      return tokens;
    } catch (error) {
      console.error('Error getting tokens:', error);
      throw error;
    }
  }
}

module.exports = new GoogleDriveService();