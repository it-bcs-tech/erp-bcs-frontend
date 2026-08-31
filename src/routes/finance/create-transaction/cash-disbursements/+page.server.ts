import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	throw redirect(308, '/finance/create-transaction/pay-bills');
};
