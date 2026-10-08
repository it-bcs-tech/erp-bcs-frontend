import { json } from '@sveltejs/kit';
import sql from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('q')?.trim() || '';
	const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));

	try {
		let materials;
		if (!query) {
			// Rekomendasi awal saat modal baru dibuka: 15 material aktif dengan stok terbanyak di gudang
			materials = await sql`
				SELECT 
					id,
					material_code,
					name,
					brand,
					part_no,
					uom,
					COALESCE(standard_price, 0) as price,
					COALESCE(stock, 0) as stock
				FROM master.m_materials
				WHERE is_active = true
				ORDER BY stock DESC, name ASC
				LIMIT ${limit}
			`;
		} else {
			const pattern = `%${query}%`;
			materials = await sql`
				SELECT 
					id,
					material_code,
					name,
					brand,
					part_no,
					uom,
					COALESCE(standard_price, 0) as price,
					COALESCE(stock, 0) as stock
				FROM master.m_materials
				WHERE is_active = true
				  AND (
					name ILIKE ${pattern} OR 
					material_code ILIKE ${pattern} OR 
					part_no ILIKE ${pattern} OR 
					brand ILIKE ${pattern}
				  )
				ORDER BY 
					CASE WHEN stock > 0 THEN 0 ELSE 1 END,
					name ASC
				LIMIT ${limit}
			`;
		}

		return json({
			success: true,
			data: materials.map(m => ({
				id: m.id,
				code: m.material_code,
				name: m.name,
				brand: m.brand || '',
				partNo: m.part_no || '',
				uom: m.uom || 'PCS',
				price: Number(m.price || 0),
				stock: Number(m.stock || 0)
			}))
		});
	} catch (error: any) {
		console.error("Error searching PMS materials:", error);
		return json({
			success: false,
			message: "Gagal mencari katalog suku cadang PMS."
		}, { status: 500 });
	}
};
