const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const config = require('../config/env');

async function buildDrive() {
	if (!config.enableGoogleDrive) return null;
	const scopes = ['https://www.googleapis.com/auth/drive'];
	const auth = await google.auth.getClient({ scopes });
	return google.drive({ version: 'v3', auth });
}

function getMimeTypeByExtension(filePath) {
	const ext = path.extname(filePath).toLowerCase();
	if (ext === '.pdf') return 'application/pdf';
	if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
	if (ext === '.png') return 'image/png';
	return 'application/octet-stream';
}

async function uploadFile(localFilePath, targetFileName) {
	const drive = await buildDrive();
	if (!drive) {
		return { id: null, webViewLink: null, webContentLink: null };
	}
	const mimeType = getMimeTypeByExtension(localFilePath);
	const requestBody = {
		name: targetFileName,
		parents: config.googleDriveFolderId ? [config.googleDriveFolderId] : undefined
	};
	const media = {
		mimeType,
		body: fs.createReadStream(localFilePath)
	};
	const createResp = await drive.files.create({ requestBody, media, fields: 'id, webViewLink, webContentLink' });
	const file = createResp.data;
	if (config.googleDriveMakePublic && file.id) {
		try {
			await drive.permissions.create({ fileId: file.id, requestBody: { role: 'reader', type: 'anyone' } });
			const getResp = await drive.files.get({ fileId: file.id, fields: 'id, webViewLink, webContentLink' });
			return { id: getResp.data.id, webViewLink: getResp.data.webViewLink, webContentLink: getResp.data.webContentLink };
		} catch (e) {
			return { id: file.id, webViewLink: file.webViewLink || null, webContentLink: file.webContentLink || null };
		}
	}
	return { id: file.id, webViewLink: file.webViewLink || null, webContentLink: file.webContentLink || null };
}

module.exports = { uploadFile };

