/**
 * Root Layout Server Load
 * ─────────────────────────────────────────────────────────
 * Load data user dari cookie, lalu refresh dari DB agar
 * perubahan role/module oleh Admin langsung berlaku
 * tanpa user harus logout & login ulang.
 *
 * Mendukung 2 jenis token:
 *   1. Svelte internal token (base64url) → getUserFromToken()
 *   2. Laravel JWT token (eyJ...) → fallback ke email dari cookie
 * ─────────────────────────────────────────────────────────
 */

import type { LayoutServerLoad } from './$types';
import type { AuthUser } from '$lib/types/auth';
import { getUserFromToken, getAuthUserByEmail, signUserData, verifyUserData } from '$lib/server/auth';

export const load: LayoutServerLoad = async ({ cookies }) => {
	let user: AuthUser | null = null;

	const authToken = cookies.get('auth_token');
	const userDataCookie = cookies.get('user_data');

	// Parse cookie data lama (untuk fallback & mendapatkan email)
	let cookieUser: AuthUser | null = null;
	if (userDataCookie) {
		try {
			cookieUser = verifyUserData(userDataCookie) as AuthUser;
			if (!cookieUser) throw new Error('Invalid signature');
		} catch {
			cookies.delete('user_data', { path: '/' });
		}
	}

	if (authToken && cookieUser) {
		try {
			// Jika auth berasal dari Laravel (via API), kita percayakan 100% pada isi cookie
			// karena Laravel API sudah mengirimkan payload RBAC / allowedModules yang benar.
			if (cookieUser.authSource === 'laravel' && authToken.startsWith('eyJ')) {
				user = cookieUser;
			} else {
				// Jika token Svelte internal, baru lakukan validasi ke DB lokal Svelte
				let freshUser = await getUserFromToken(authToken);

				if (freshUser) {
					freshUser.authSource = cookieUser.authSource;
					user = freshUser;

					cookies.set('user_data', signUserData(user), {
						path: '/',
						httpOnly: true,
						sameSite: 'lax',
						maxAge: 60 * 60 * 24
					});
				} else {
					user = cookieUser;
				}
			}
		} catch {
			user = cookieUser;
		}
	} else if (cookieUser) {
		// Ada cookie tapi tidak ada token — pakai cookie apa adanya
		user = cookieUser;
	}

	return {
		user
	};
};
