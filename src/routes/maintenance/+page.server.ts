import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Arahkan pengunjung dari menu utama langsung ke Dashboard Mekanik
	throw redirect(303, '/maintenance/dashboard');
};
