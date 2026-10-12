import type { LayoutServerLoad } from './$types';
import { verifyUserData } from '$lib/server/auth';

export const load: LayoutServerLoad = async ({ cookies }) => {
	let currentUser: any = null;
	const userDataCookie = cookies.get('user_data');
	if (userDataCookie) {
		try {
			currentUser = verifyUserData(userDataCookie);
		} catch (e) {}
	}

	return {
		user: currentUser
	};
};
