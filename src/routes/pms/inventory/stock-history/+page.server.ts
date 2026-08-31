import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const search = (url.searchParams.get('q') || '').trim().toLowerCase();
		const typeFilter = url.searchParams.get('type') || '';

		const transactions = await sql`
			SELECT 
				it.id,
				to_char(it.created_at, 'YYYY-MM-DD HH24:MI') as date,
				it.transaction_type as "transactionType",
				it.qty,
				it.reference_no as "referenceNo",
				it.note,
				it.created_by as "createdBy",
				m.material_code as "materialCode",
				m.name as "materialName",
				m.uom,
				COALESCE(m.stock, 0) as "currentStock"
			FROM master.m_inventory_transactions it
			JOIN master.m_materials m ON m.id = it.material_id
			ORDER BY it.created_at DESC, it.id DESC
		`;

		let filtered = transactions;
		if (search) {
			filtered = filtered.filter(t =>
				(t.materialName && t.materialName.toLowerCase().includes(search)) ||
				(t.materialCode && t.materialCode.toLowerCase().includes(search)) ||
				(t.referenceNo && t.referenceNo.toLowerCase().includes(search)) ||
				(t.createdBy && t.createdBy.toLowerCase().includes(search)) ||
				(t.note && t.note.toLowerCase().includes(search))
			);
		}
		if (typeFilter) {
			filtered = filtered.filter(t => t.transactionType === typeFilter);
		}

		return {
			transactions: filtered
		};
	} catch (err: any) {
		console.error('Error loading inventory transactions:', err);
		return { transactions: [] };
	}
};
