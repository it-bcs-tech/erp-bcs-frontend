import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';

export const GET: RequestHandler = async ({ params }) => {
    const filename = params.file;
    if (!filename) {
        throw error(400, 'Filename is required');
    }

    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
        throw error(400, 'Invalid filename');
    }

    const uploadDir = join(process.cwd(), 'uploads');
    const filePath = join(uploadDir, filename);

    if (!existsSync(filePath)) {
        throw error(404, 'File not found');
    }

    // Simple extension mapping
    const ext = filename.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === 'pdf') contentType = 'application/pdf';
    else if (ext === 'png') contentType = 'image/png';
    else if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';

    const stream = createReadStream(filePath);

    return new Response(stream as any, {
        headers: {
            'Content-Type': contentType,
            // 'Content-Disposition': `inline; filename="${filename}"`
            // use inline to allow browser to preview PDF
        }
    });
};
