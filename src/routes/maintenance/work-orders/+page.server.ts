import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const query = url.searchParams.toString();
	throw redirect(308, `/maintenance/transactions/work-orders${query ? '?' + query : ''}`);
};
