import type { PageServerLoad } from './$types';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get('search')?.toLowerCase() || '';

	try {
		let searchCondition = sql``;
		if (search) {
			searchCondition = sql`AND (
				k.nama_karyawan ILIKE ${'%' + search + '%'} OR 
				k.payroll_id ILIKE ${'%' + search + '%'} OR
				k.divisi ILIKE ${'%' + search + '%'} OR
				k.jabatan ILIKE ${'%' + search + '%'}
			)`;
		}

		const mechanics = await sql`
			SELECT 
				k.id,
				k.payroll_id,
				k.nama_karyawan,
				k.divisi,
				k.jabatan,
				k.lokasi_kerja,
				k.aktif,
				COUNT(w.id) as total_wo_handled,
				COUNT(w.id) FILTER (WHERE w.status IN ('Proses', 'Open')) as active_wo
			FROM master.m_karyawan k
			LEFT JOIN fleet.work_orders w ON k.payroll_id = w.mechanic_id
			WHERE k.aktif = 'Y'
			${searchCondition}
			GROUP BY k.id
			ORDER BY total_wo_handled DESC, k.nama_karyawan ASC
		`;

		return {
			mechanics: mechanics.map(m => ({
				id: m.id,
				payrollId: m.payroll_id,
				name: m.nama_karyawan,
				department: m.divisi || 'Workshop / Bengkel',
				position: m.jabatan || 'Teknisi / Mekanik',
				location: m.lokasi_kerja || 'Pool Pusat',
				totalWo: parseInt(m.total_wo_handled || '0'),
				activeWo: parseInt(m.active_wo || '0'),
				status: m.aktif === 'Y' ? 'Aktif' : 'Non-Aktif'
			}))
		};
	} catch (error) {
		console.error("Database error loading mechanics master:", error);
		return { mechanics: [] };
	}
};
