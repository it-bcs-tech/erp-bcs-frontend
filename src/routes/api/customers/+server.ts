import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { name } = await request.json();
		if (!name) return json({ error: 'Name is required' }, { status: 400 });

		const kode = `QC-${Math.floor(Date.now() / 1000)}`;

		const result = await sql`
			INSERT INTO master.m_customer (kode_kustomer, nama_kustomer, is_active)
			VALUES (${kode}, ${name}, true)
			RETURNING id, nama_kustomer as name
		`;

		return json({ success: true, customer: result[0] });
	} catch (err: any) {
		console.error("Error creating customer:", err);
		return json({ error: err.message }, { status: 500 });
	}
};
