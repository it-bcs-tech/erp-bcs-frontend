/**
 * Root Layout Server Load
 * ─────────────────────────────────────────────────────────
 * Load data user dari cookie dan pass ke semua page.
 * Data ini digunakan oleh +layout.svelte untuk hydrate auth store.
 */

import type { LayoutServerLoad } from './$types';
import type { AuthUser } from '$lib/types/auth';

export const load: LayoutServerLoad = async ({ cookies }) => {
	let user: AuthUser | null = null;

	const userDataCookie = cookies.get('user_data');
	if (userDataCookie) {
		try {
			user = JSON.parse(userDataCookie) as AuthUser;
		} catch {
			// Cookie corrupt, hapus
			cookies.delete('user_data', { path: '/' });
		}
	}

	return {
		user
	};
};
