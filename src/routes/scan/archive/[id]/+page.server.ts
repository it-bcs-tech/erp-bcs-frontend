import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const id = parseInt(params.id, 10);
	if (isNaN(id)) {
		throw error(400, 'ID Arsip tidak valid');
	}

	try {
		const [archives, helpdesk] = await Promise.all([
			sql`
				SELECT 
					a.id,
					a.archive_number,
					a.department,
					a.document_name,
					a.document_year,
					a.retention_years,
					to_char(a.destruction_date, 'DD Mon YYYY') as destruction_date,
					a.status,
					a.file_path,
					to_char(a.created_at, 'DD Mon YYYY HH24:MI') as registered_at,
					r.rack_name,
					s.shelf_name,
					a.rack_id,
					a.shelf_id,
					CASE
						WHEN a.destruction_date IS NOT NULL AND a.destruction_date <= CURRENT_DATE THEN true
						ELSE false
					END as is_due_destruction
				FROM ga.archives a
				LEFT JOIN ga.archive_racks r ON a.rack_id = r.id
				LEFT JOIN ga.archive_shelves s ON a.shelf_id = s.id
				WHERE a.id = ${id}
				LIMIT 1
			`,
			sql`
				SELECT setting_value 
				FROM master.sys_settings 
				WHERE setting_key = 'ga_helpdesk_whatsapp' 
				LIMIT 1
			`.catch(() => [])
		]);

		if (!archives || archives.length === 0) {
			return {
				archive: null,
				siblings: [],
				id,
				helpdeskPhone: '628111978227'
			};
		}

		const archive = archives[0];

		// Load sibling documents on the same shelf (max 10)
		const siblings = await sql`
			SELECT id, archive_number, document_name, document_year, department, status, file_path
			FROM ga.archives
			WHERE rack_id = ${archive.rack_id} AND shelf_id = ${archive.shelf_id} AND id != ${archive.id}
			ORDER BY archive_number ASC, id ASC
			LIMIT 12
		`;

		const helpdeskPhone = (helpdesk && helpdesk[0]?.setting_value) || '628111978227';

		return {
			archive,
			siblings,
			id,
			helpdeskPhone
		};
	} catch (err: any) {
		console.error('Error loading public archive scan:', err);
		throw error(500, 'Gagal memuat informasi arsip');
	}
};
