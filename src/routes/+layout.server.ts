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
import { getUserFromToken, getAuthUserByEmail } from '$lib/server/auth';

export const load: LayoutServerLoad = async ({ cookies }) => {
	let user: AuthUser | null = null;

	const authToken = cookies.get('auth_token');
	const userDataCookie = cookies.get('user_data');

	// Parse cookie data lama (untuk fallback & mendapatkan email)
	let cookieUser: AuthUser | null = null;
	if (userDataCookie) {
		try {
			cookieUser = JSON.parse(userDataCookie) as AuthUser;
		} catch {
			cookies.delete('user_data', { path: '/' });
		}
	}

	if (authToken && cookieUser) {
		try {
			let freshUser: AuthUser | null = null;

			// Coba decode token internal Svelte dulu
			if (!authToken.startsWith('eyJ')) {
				freshUser = await getUserFromToken(authToken);
			}

			// Jika token Svelte gagal atau token adalah JWT Laravel,
			// refresh dari DB menggunakan email dari cookie
			if (!freshUser && cookieUser.email) {
				freshUser = await getAuthUserByEmail(cookieUser.email);
			}

			if (freshUser) {
				// Pertahankan authSource dari cookie lama
				freshUser.authSource = cookieUser.authSource;
				user = freshUser;

				// Update cookie dengan data terbaru dari DB
				cookies.set('user_data', JSON.stringify(user), {
					path: '/',
					httpOnly: false,
					sameSite: 'lax',
					maxAge: 60 * 60 * 24
				});
			} else {
				// DB tidak menemukan user, pakai cookie lama
				user = cookieUser;
			}
		} catch {
			// Jika DB error, fallback ke cookie lama
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
