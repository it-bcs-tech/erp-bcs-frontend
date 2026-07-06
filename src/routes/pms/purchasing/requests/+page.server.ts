import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	try {
		// Fetch Purchase Requests
		const requests = await sql`
			SELECT 
				pr.id,
				pr.pr_number,
				pr.date,
				pr.department,
				pr.requested_by,
				pr.status,
				COUNT(prl.id) as item_count
			FROM procurement.purchase_request pr
			LEFT JOIN procurement.purchase_request_line prl ON prl.pr_id = pr.id
			GROUP BY pr.id
			ORDER BY pr.created_at DESC
		`;

		return {
			requests
		};
	} catch (err: any) {
		console.error("Error fetching purchase requests:", err);
		throw error(500, 'Gagal mengambil data Purchase Request');
	}
};
