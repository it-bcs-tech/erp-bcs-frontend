import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const search = (url.searchParams.get('q') || '').trim().toLowerCase();
		const typeFilter = url.searchParams.get('type') || '';

		const materials = await sql`
			SELECT 
				m.id,
				m.material_code as "materialCode",
				m.name,
				COALESCE(m.spec, '-') as spec,
				COALESCE(m.brand, '-') as brand,
				COALESCE(m.part_no, '-') as "partNo",
				m.uom,
				COALESCE(m.stock, 0) as stock,
				COALESCE(m.min_stock, 0) as "minStock",
				COALESCE(m.standard_price, 0) as "standardPrice",
				COALESCE(mt.name, m.type_code, 'Umum') as "typeName",
				COALESCE(l.loc_name, 'Gudang Pusat') as "locationName",
				m.is_active
			FROM master.m_materials m
			LEFT JOIN master.m_material_types mt ON mt.code = m.type_code
			LEFT JOIN master.m_lokasi l ON l.id = m.location_id
			ORDER BY m.id DESC
		`;

		const types = await sql`SELECT code, name FROM master.m_material_types ORDER BY name`;
		const sites = await sql`SELECT id, loc_code, loc_name FROM master.m_lokasi ORDER BY loc_code`;

		let filtered = materials;
		if (search) {
			filtered = filtered.filter(m =>
				(m.name && m.name.toLowerCase().includes(search)) ||
				(m.materialCode && m.materialCode.toLowerCase().includes(search)) ||
				(m.brand && m.brand.toLowerCase().includes(search)) ||
				(m.partNo && m.partNo.toLowerCase().includes(search)) ||
				(m.spec && m.spec.toLowerCase().includes(search))
			);
		}
		if (typeFilter) {
			filtered = filtered.filter(m => m.typeName === typeFilter || m.type_code === typeFilter);
		}

		return {
			materials: filtered,
			types,
			sites
		};
	} catch (err: any) {
		console.error('Error loading PMS materials:', err);
		return { materials: [], types: [], sites: [] };
	}
};

export const actions: Actions = {
	save: async ({ request }) => {
		const formData = await request.formData();
		const code = (formData.get('materialCode') as string || '').trim().toUpperCase();
		const name = (formData.get('name') as string || '').trim();
		const spec = (formData.get('spec') as string || '').trim();
		const brand = (formData.get('brand') as string || '').trim();
		const partNo = (formData.get('partNo') as string || '').trim();
		const uom = (formData.get('uom') as string || 'Pcs').trim();
		const typeCode = (formData.get('typeCode') as string || '').trim();
		const locationId = formData.get('locationId') ? parseInt(formData.get('locationId') as string) : null;
		const minStock = parseFloat(formData.get('minStock') as string || '0');
		const price = parseFloat(formData.get('standardPrice') as string || '0');

		if (!name) {
			return fail(400, { success: false, message: 'Nama Material wajib diisi!' });
		}

		try {
			await sql`
				INSERT INTO master.m_materials (
					material_code,
					name,
					spec,
					brand,
					part_no,
					uom,
					type_code,
					location_id,
					min_stock,
					standard_price,
					stock,
					is_active
				) VALUES (
					${code || `MAT-${Date.now().toString().slice(-6)}`},
					${name},
					${spec},
					${brand},
					${partNo},
					${uom},
					${typeCode || 'GENERAL'},
					${locationId},
					${minStock},
					${price},
					0,
					true
				)
			`;
			return { success: true, message: 'Material berhasil ditambahkan!' };
		} catch (err: any) {
			console.error('Error creating material:', err);
			return fail(500, { success: false, message: err.message || 'Gagal menyimpan material' });
		}
	}
};
