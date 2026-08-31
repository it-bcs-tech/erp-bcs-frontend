import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const search = (url.searchParams.get('q') || '').trim().toLowerCase();

		const deliveryNotes = await sql`
			SELECT 
				dn.id,
				dn.dn_number as "dnNumber",
				to_char(dn.date, 'YYYY-MM-DD') as date,
				COALESCE(s1.loc_name, 'Gudang Pusat') as "fromSite",
				COALESCE(s2.loc_name, 'Pool Merak') as "toSite",
				COALESCE(dn.courier_name, '-') as "courierName",
				COALESCE(dn.vehicle_no, '-') as "vehicleNo",
				dn.status,
				dn.notes,
				COUNT(dni.id) as item_count,
				COALESCE(SUM(dni.qty), 0) as total_qty
			FROM procurement.delivery_note dn
			LEFT JOIN master.m_lokasi s1 ON s1.id = dn.from_site_id
			LEFT JOIN master.m_lokasi s2 ON s2.id = dn.to_site_id
			LEFT JOIN procurement.delivery_note_item dni ON dni.dn_id = dn.id
			GROUP BY dn.id, s1.loc_name, s2.loc_name
			ORDER BY dn.id DESC
		`;

		const sites = await sql`SELECT id, loc_code, loc_name FROM master.m_lokasi ORDER BY loc_code`;
		const materials = await sql`SELECT id, material_code, name, uom FROM master.m_materials WHERE is_active = true ORDER BY name`;

		let filtered = deliveryNotes;
		if (search) {
			filtered = filtered.filter(dn =>
				(dn.dnNumber && dn.dnNumber.toLowerCase().includes(search)) ||
				(dn.fromSite && dn.fromSite.toLowerCase().includes(search)) ||
				(dn.toSite && dn.toSite.toLowerCase().includes(search)) ||
				(dn.courierName && dn.courierName.toLowerCase().includes(search)) ||
				(dn.vehicleNo && dn.vehicleNo.toLowerCase().includes(search))
			);
		}

		return {
			deliveryNotes: filtered,
			sites,
			materials
		};
	} catch (err: any) {
		console.error('Error loading Delivery Notes:', err);
		return { deliveryNotes: [], sites: [], materials: [] };
	}
};

export const actions: Actions = {
	save: async ({ request }) => {
		const formData = await request.formData();
		const date = formData.get('date') as string || new Date().toISOString().split('T')[0];
		const fromSiteId = formData.get('fromSiteId') ? parseInt(formData.get('fromSiteId') as string) : null;
		const toSiteId = formData.get('toSiteId') ? parseInt(formData.get('toSiteId') as string) : null;
		const courierName = (formData.get('courierName') as string || '').trim();
		const vehicleNo = (formData.get('vehicleNo') as string || '').trim().toUpperCase();
		const notes = (formData.get('notes') as string || '').trim();
		const materialId = formData.get('materialId') ? parseInt(formData.get('materialId') as string) : null;
		const qty = parseFloat(formData.get('qty') as string || '1');

		try {
			const now = new Date();
			const yymm = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
			const [seqRow] = await sql`SELECT COUNT(*) as count FROM procurement.delivery_note`;
			const seq = (parseInt(seqRow?.count || '0') + 1).toString().padStart(4, '0');
			const dnNumber = `DN-${yymm}-${seq}`;

			const [dn] = await sql`
				INSERT INTO procurement.delivery_note (
					dn_number,
					date,
					from_site_id,
					to_site_id,
					courier_name,
					vehicle_no,
					status,
					notes
				) VALUES (
					${dnNumber},
					${date},
					${fromSiteId},
					${toSiteId},
					${courierName},
					${vehicleNo},
					'DELIVERED',
					${notes}
				) RETURNING id
			`;

			if (materialId) {
				await sql`
					INSERT INTO procurement.delivery_note_item (
						dn_id,
						material_id,
						qty,
						uom,
						notes
					) VALUES (
						${dn.id},
						${materialId},
						${qty},
						'Pcs',
						${notes}
					)
				`;
			}

			return { success: true, message: 'Surat Jalan (DN) berhasil dibuat!' };
		} catch (err: any) {
			console.error('Error creating Delivery Note:', err);
			return fail(500, { success: false, message: err.message || 'Gagal menyimpan Delivery Note' });
		}
	}
};
