import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const code = decodeURIComponent(params.code).trim();
	if (!code) {
		throw error(400, 'Kode aset tidak valid');
	}

	try {
		const [assets, helpdesk] = await Promise.all([
			sql`
				SELECT 
					a.id,
					a.asset_code,
					a.name,
					a.category,
					a.brand_model,
					a.serial_number,
					to_char(a.acquisition_date, 'DD Mon YYYY') as acquisition_date,
					a.location,
					a.room,
					a.pic_name,
					a.condition,
					a.status,
					a.notes,
					a.vehicle_group,
					a.km_per_liter,
					fp.fuel_name,
					c.police_number as car_police_number,
					c.car_name as car_model,
					to_char(a.created_at, 'DD Mon YYYY HH24:MI') as registered_at
				FROM ga.assets a
				LEFT JOIN ga.travel_fuel_prices fp ON fp.id = a.fuel_id
				LEFT JOIN ga.cars c ON c.id = a.car_id
				WHERE LOWER(a.asset_code) = LOWER(${code}) OR a.id::text = ${code}
				LIMIT 1
			`,
			sql`
				SELECT setting_value 
				FROM master.sys_settings 
				WHERE setting_key = 'ga_helpdesk_whatsapp' 
				LIMIT 1
			`.catch(() => [])
		]);

		if (!assets || assets.length === 0) {
			return {
				asset: null,
				mutations: [],
				code,
				helpdeskPhone: '6281234567890'
			};
		}

		const asset = assets[0];

		// Load mutation timeline
		const mutations = await sql`
			SELECT 
				m.id,
				to_char(m.mutation_date, 'DD Mon YYYY') as mutation_date,
				m.from_location,
				m.to_location,
				m.from_pic,
				m.to_pic,
				m.reason,
				m.approved_by,
				to_char(m.created_at, 'DD Mon YYYY HH24:MI') as created_at
			FROM ga.asset_mutations m
			WHERE m.asset_id = ${asset.id}
			ORDER BY m.mutation_date DESC, m.id DESC
		`;

		const helpdeskPhone = (helpdesk && helpdesk[0]?.setting_value) || '628111978227';

		return {
			asset,
			mutations,
			code,
			helpdeskPhone
		};
	} catch (err: any) {
		console.error('Error loading public asset scan:', err);
		throw error(500, 'Gagal memuat informasi aset');
	}
};
