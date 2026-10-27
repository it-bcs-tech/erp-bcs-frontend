import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { createReadStream, existsSync } from 'fs';
import { join, normalize } from 'path';

export const GET: RequestHandler = async ({ params }) => {
	const filename = params.file;
	if (!filename) {
		throw error(400, 'Filename is required');
	}

	// Security: prevent directory traversal
	if (filename.includes('..')) {
		throw error(400, 'Invalid filename');
	}

	const uploadDir = join(process.cwd(), 'uploads');
	const filePath = join(uploadDir, filename);

	// Verify resolved path stays within uploadDir
	if (!normalize(filePath).startsWith(uploadDir)) {
		throw error(400, 'Invalid file path');
	}

	if (!existsSync(filePath)) {
		throw error(404, 'File not found');
	}

	// Simple extension mapping
	const ext = filename.split('.').pop()?.toLowerCase();
	let contentType = 'application/octet-stream';
	if (ext === 'pdf') contentType = 'application/pdf';
	else if (ext === 'png') contentType = 'image/png';
	else if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
	else if (ext === 'webp') contentType = 'image/webp';
	else if (ext === 'svg') contentType = 'image/svg+xml';

	const stream = createReadStream(filePath);

	return new Response(stream as any, {
		headers: {
			'Content-Type': contentType,
			'Cache-Control': 'public, max-age=86400'
		}
	});
};
