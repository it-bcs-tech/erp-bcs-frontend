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
				t.title ILIKE ${'%' + search + '%'} OR
				d.dept_name ILIKE ${'%' + search + '%'} OR
				loc.loc_name ILIKE ${'%' + search + '%'}
			)`;
		}

		const mechanics = await sql`
			SELECT 
				k.id,
				k.payroll_id,
				k.nama_karyawan,
				COALESCE(t.title, k.title, 'Mekanik') as jabatan,
				COALESCE(d.dept_name, div.div_name, 'Workshop') as departemen,
				COALESCE(loc.loc_name, k.lokasi, 'Pool') as lokasi_kerja,
				k.aktif,
				COUNT(w.id) as total_wo_handled,
				COUNT(w.id) FILTER (WHERE w.status IN ('Proses', 'Open', 'In Progress', 'Draft')) as active_wo
			FROM master.m_karyawan k
			LEFT JOIN master.m_title t ON k.title = t.title_code
			LEFT JOIN master.m_dept d ON (k.dept_id = d.dept_code OR k.dept_id = d.id::text)
			LEFT JOIN master.m_division div ON (k.div_id = div.div_code OR k.div_id = div.id::text)
			LEFT JOIN master.m_lokasi loc ON (k.lokasi = loc.loc_code OR k.lokasi = loc.id::text)
			LEFT JOIN fleet.work_orders w ON k.payroll_id = w.mechanic_id
			WHERE k.aktif = 'Y'
			  AND (
				LOWER(COALESCE(t.title, '')) LIKE '%mekanik%' OR 
				LOWER(COALESCE(t.title, '')) LIKE '%mechanic%' OR 
				LOWER(COALESCE(t.title, '')) LIKE '%teknisi%' OR 
				LOWER(COALESCE(t.title, '')) LIKE '%body repair%' OR
				LOWER(COALESCE(t.title, '')) LIKE '%welder%' OR
				LOWER(COALESCE(d.dept_name, '')) LIKE '%workshop%' OR
				(LOWER(COALESCE(d.dept_name, '')) LIKE '%maintenance%' AND LOWER(COALESCE(d.dept_name, '')) NOT LIKE '%software%') OR
				k.payroll_id IN (SELECT DISTINCT mechanic_id FROM fleet.work_orders WHERE mechanic_id IS NOT NULL)
			  )
			${searchCondition}
			GROUP BY k.id, k.payroll_id, k.nama_karyawan, t.title, k.title, d.dept_name, div.div_name, loc.loc_name, k.lokasi, k.aktif
			ORDER BY total_wo_handled DESC, k.nama_karyawan ASC
		`;

		return {
			mechanics: mechanics.map(m => ({
				id: m.id,
				payrollId: m.payroll_id,
				name: m.nama_karyawan,
				department: m.departemen || 'Workshop / Bengkel',
				position: m.jabatan || 'Teknisi / Mekanik',
				location: m.lokasi_kerja || 'Pool',
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
