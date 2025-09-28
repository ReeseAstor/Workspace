const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');

function buildSupabaseClient() {
	if (!config.enableSupabase) return null;
	if (!config.supabaseUrl || !config.supabaseServiceRoleKey) return null;
	return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
		auth: { persistSession: false }
	});
}

function getMimeTypeByExtension(filePath) {
	const ext = path.extname(filePath).toLowerCase();
	if (ext === '.pdf') return 'application/pdf';
	if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
	if (ext === '.png') return 'image/png';
	return 'application/octet-stream';
}

async function uploadFinancialDocument(localFilePath, remotePath) {
	const client = buildSupabaseClient();
	if (!client) {
		return { path: null, publicUrl: null };
	}
	const fileBuffer = fs.readFileSync(localFilePath);
	const contentType = getMimeTypeByExtension(localFilePath);
	const { data, error } = await client.storage
		.from(config.supabaseBucket)
		.upload(remotePath, fileBuffer, { contentType, upsert: true });
	if (error) {
		return { path: null, publicUrl: null, error };
	}
	let publicUrl = null;
	if (config.supabasePublicFiles) {
		const { data: pub } = client.storage.from(config.supabaseBucket).getPublicUrl(data.path);
		publicUrl = pub ? pub.publicUrl : null;
	}
	return { path: data.path, publicUrl };
}

module.exports = { uploadFinancialDocument };

