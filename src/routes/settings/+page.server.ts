import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';
import { ADMIN_ROLES } from '$lib/types/auth';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();

	// Proteksi ketat: Hanya Super Admin / Administrator yang diizinkan mengakses halaman Settings
	const isSuperAdmin = user && (ADMIN_ROLES.includes(user.role) || ['superadmin', 'superhyperadmin', 'super_admin', 'administrator'].includes(user.role));

	if (!isSuperAdmin) {
		throw redirect(303, '/');
	}
	try {
		// Ambil status pool logistik & database health
		const poolList = await sql`
			SELECT id, pool_name, lokasi_pool, status_operasional 
			FROM master.m_pool 
			ORDER BY id ASC
			LIMIT 10
		`;

		return {
			pools: poolList || []
		};
	} catch (e: any) {
		console.warn('Fallback settings load:', e?.message);
		return {
			pools: [
				{ id: 1, pool_name: 'Pool Cilegon Utama', lokasi_pool: 'Gerem, Cilegon, Banten', status_operasional: 'Active' },
				{ id: 2, pool_name: 'Pool Gunung Putri', lokasi_pool: 'Wanaherang, Gunung Putri, Bogor', status_operasional: 'Active' }
			]
		};
	}
};
