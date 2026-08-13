import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	try {
		// Example stats fetching
		const statsRaw = await sql`
			SELECT 
				status,
				COUNT(*) as count
			FROM documents.documents
			GROUP BY status
		`;

		const totalDocs = await sql`SELECT COUNT(*) FROM documents.documents`;
		const expiredDocs = await sql`SELECT COUNT(*) FROM documents.documents WHERE status = 'EXPIRED'`;
		const activeDocs = await sql`SELECT COUNT(*) FROM documents.documents WHERE status = 'ACTIVE'`;

		return {
			stats: {
				total: Number(totalDocs[0]?.count || 0),
				expired: Number(expiredDocs[0]?.count || 0),
				active: Number(activeDocs[0]?.count || 0)
			}
		};
	} catch (err: any) {
		console.error("Error loading DMS dashboard:", err);
		throw error(500, 'Gagal memuat dashboard DMS');
	}
};
