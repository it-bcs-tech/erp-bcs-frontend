import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import sql from '$lib/server/db';
import { verifyUserData } from '$lib/server/auth';
import { ADMIN_ROLES, type AuthUser } from '$lib/types/auth';

export const GET: RequestHandler = async ({ url, cookies }) => {
	// Simple auth check for API
	const userDataCookie = cookies.get('user_data');
	if (!userDataCookie) return json({ error: 'Unauthorized' }, { status: 401 });
	
	try {
		const user: AuthUser | null = verifyUserData(userDataCookie);
		if (!user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
		if (!ADMIN_ROLES.includes(user.role) && !['superadmin', 'superhyperadmin', 'super_admin', 'administrator'].includes(user.role)) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}
	} catch (e: any) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const query = url.searchParams.get('q') || '';
	
	if (query.length < 3) {
		return json([]); // minimal 3 char to search
	}

	try {
		const searchPattern = `%${query}%`;
		const employees = await sql`
			SELECT 
				mk.id,
				mk.payroll_id AS nik,
				mk.nama_karyawan,
				mk.email,
				mt.title AS title_name,
				ml.level AS level_name,
				md.div_name
			FROM master.m_karyawan mk
			LEFT JOIN master.m_level ml ON ml.level_code = mk.level
			LEFT JOIN master.m_division md ON md.div_code = mk.div_id
			LEFT JOIN master.m_title mt ON mt.title_code = mk.title
			WHERE mk.aktif = 'Y' 
			  AND (mk.nama_karyawan ILIKE ${searchPattern} OR mk.payroll_id ILIKE ${searchPattern})
			ORDER BY mk.nama_karyawan ASC
			LIMIT 10
		`;

		return json(employees);
	} catch (error: any) {
		return json({ error: error.message }, { status: 500 });
	}
};
