import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const search = (url.searchParams.get('q') || '').trim().toLowerCase();

		const sites = await sql`
			SELECT 
				id,
				loc_code as "locCode",
				loc_name as "locName",
				COALESCE(alias, loc_code) as alias,
				COALESCE(contact_person, '-') as "contactPerson",
				COALESCE(phone, '-') as phone,
				COALESCE(address_1, '-') as "address1",
				COALESCE(city, 'Cilegon') as city,
				COALESCE(state, 'Banten') as state
			FROM master.m_lokasi
			ORDER BY loc_code ASC
		`;

		let filtered = sites;
		if (search) {
			filtered = filtered.filter(s =>
				(s.locName && s.locName.toLowerCase().includes(search)) ||
				(s.locCode && s.locCode.toLowerCase().includes(search)) ||
				(s.alias && s.alias.toLowerCase().includes(search)) ||
				(s.city && s.city.toLowerCase().includes(search))
			);
		}

		return {
			sites: filtered
		};
	} catch (err: any) {
		console.error('Error loading PMS sites:', err);
		return { sites: [] };
	}
};

export const actions: Actions = {
	save: async ({ request }) => {
		const formData = await request.formData();
		const code = (formData.get('locCode') as string || '').trim().toUpperCase();
		const name = (formData.get('locName') as string || '').trim();
		const alias = (formData.get('alias') as string || '').trim();
		const contact = (formData.get('contactPerson') as string || '').trim();
		const phone = (formData.get('phone') as string || '').trim();
		const address1 = (formData.get('address1') as string || '').trim();
		const city = (formData.get('city') as string || '').trim();
		const state = (formData.get('state') as string || '').trim();

		if (!code || !name) {
			return fail(400, { success: false, message: 'Kode dan Nama Site wajib diisi!' });
		}

		try {
			await sql`
				INSERT INTO master.m_lokasi (
					loc_code,
					loc_name,
					alias,
					contact_person,
					phone,
					address_1,
					city,
					state
				) VALUES (
					${code},
					${name},
					${alias || code},
					${contact},
					${phone},
					${address1},
					${city || 'Cilegon'},
					${state || 'Banten'}
				)
			`;
			return { success: true, message: 'Site berhasil ditambahkan!' };
		} catch (err: any) {
			console.error('Error creating site:', err);
			return fail(500, { success: false, message: err.message || 'Gagal menyimpan site' });
		}
	}
};
