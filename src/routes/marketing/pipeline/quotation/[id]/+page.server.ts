import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

import sql from '$lib/server/db';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;

	try {
		const deals = await sql`
			SELECT id, company_name, contact_person, phone, project_category, 
			       estimated_tonnage, estimated_value, stage, expected_date 
			FROM marketing.deals
			WHERE id = ${id}
		`;

		if (deals.length === 0) {
			throw error(404, 'Deal not found');
		}

		return {
			deal: deals[0] as any
		};
	} catch (e: any) {
		console.error("Error loading quotation:", e);
		throw error(500, 'Failed to load quotation data');
	}
};
