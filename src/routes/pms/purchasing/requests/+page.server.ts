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

export const actions = {
	approvePR: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id');

		if (!id) {
			return { success: false, message: 'ID PR tidak valid' };
		}

		try {
			await sql`
				UPDATE procurement.purchase_request
				SET status = 'APPROVED'
				WHERE id = ${id}
			`;
			return { success: true, message: 'PR berhasil disetujui!' };
		} catch (e: any) {
			return { success: false, message: 'Gagal menyetujui PR' };
		}
	}
};
