import type { PageServerLoad, Actions } from './$types';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import { fail } from '@sveltejs/kit';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async () => {
	const restAreas = await sql`SELECT * FROM master.m_rest_area ORDER BY created_at DESC`;
	return { restAreas };
};

export const actions: Actions = {
	add: async ({ request }) => {
		const data = await request.formData();
		const nama = data.get('nama')?.toString();
		const pointsStr = data.get('points')?.toString();

		if (!nama || !pointsStr) {
			return fail(400, { message: 'All fields are required.' });
		}

		try {
			const points = JSON.parse(pointsStr);
			if (!Array.isArray(points) || points.length !== 4) {
				return fail(400, { message: 'Must exactly be 4 points.' });
			}

			await sql`
				INSERT INTO master.m_rest_area (nama_rest_area, polygon_points)
				VALUES (${nama}, ${sql.json(points)})
			`;
			
			return { success: true };
		} catch (e) {
			return fail(400, { message: 'Invalid points format.' });
		}
	},
	delete: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (id) {
			await sql`DELETE FROM master.m_rest_area WHERE id = ${id}`;
		}
		return { success: true };
	}
};
