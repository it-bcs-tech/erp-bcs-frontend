import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { createReadStream, existsSync, statSync } from 'fs';
import { join, normalize } from 'path';

function getContentType(filename: string): string {
	const ext = filename.split('.').pop()?.toLowerCase();
	switch (ext) {
		case 'pdf':
			return 'application/pdf';
		case 'png':
			return 'image/png';
		case 'jpg':
		case 'jpeg':
			return 'image/jpeg';
		case 'webp':
			return 'image/webp';
		case 'svg':
			return 'image/svg+xml';
		default:
			return 'application/octet-stream';
	}
}

function resolveFilePath(filename: string): string | null {
	if (!filename || filename.includes('..')) return null;

	// Normalize filename: strip repetitive "uploads/" prefix
	const cleanName = filename.replace(/^uploads[\/\\]+/, '').replace(/^[\/\\]+/, '');
	const baseUploadDir = join(process.cwd(), 'uploads');

	const candidates = [
		join(baseUploadDir, cleanName),
		join(baseUploadDir, 'dms', cleanName),
		join(baseUploadDir, 'b3', cleanName),
		join(baseUploadDir, 'contracts', cleanName)
	];

	if (process.env.LEGACY_UPLOADS_DIR && existsSync(process.env.LEGACY_UPLOADS_DIR)) {
		candidates.push(join(process.env.LEGACY_UPLOADS_DIR, cleanName));
	}

	for (const candidate of candidates) {
		const norm = normalize(candidate);
		if (existsSync(norm)) {
			try {
				if (statSync(norm).isFile()) {
					return norm;
				}
			} catch {
				// Ignore file access error
			}
		}
	}

	return null;
}

export const GET: RequestHandler = async ({ params }) => {
	const filename = params.file;
	if (!filename) {
		throw error(400, 'Filename is required');
	}

	const filePath = resolveFilePath(filename);
	if (!filePath) {
		throw error(404, 'File not found');
	}

	const contentType = getContentType(filePath);
	const stream = createReadStream(filePath);

	return new Response(stream as any, {
		headers: {
			'Content-Type': contentType,
			'Cache-Control': 'public, max-age=86400',
			'Content-Disposition': 'inline'
		}
	});
};

export const HEAD: RequestHandler = async ({ params }) => {
	const filename = params.file;
	if (!filename) {
		return new Response(null, { status: 400 });
	}

	const filePath = resolveFilePath(filename);
	if (!filePath) {
		return new Response(null, { status: 404 });
	}

	const contentType = getContentType(filePath);
	const stat = statSync(filePath);

	return new Response(null, {
		status: 200,
		headers: {
			'Content-Type': contentType,
			'Content-Length': String(stat.size),
			'Cache-Control': 'public, max-age=86400'
		}
	});
};
