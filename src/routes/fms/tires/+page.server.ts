import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	// Auto-redirect dari modul FMS ke modul Maintenance
	throw redirect(307, `/maintenance/tires${url.search}`);
};
