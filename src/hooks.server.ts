import { redirect, type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const authToken = event.cookies.get('auth_token');
	const pathname = event.url.pathname;
	const isLoginPage = pathname.startsWith('/login');
	const isLogoutEndpoint = pathname.startsWith('/logout');
	const isApiRoute = pathname.startsWith('/api');

	// Biarkan logout dan API berjalan tanpa guard
	if (isLogoutEndpoint || isApiRoute) {
		return resolve(event);
	}

	// Jika pengguna belum login, arahkan ke halaman login
	if (!authToken && !isLoginPage) {
		return redirect(303, '/login');
	}

	// Jika pengguna sudah login tapi membuka halaman login, arahkan ke home
	if (authToken && isLoginPage) {
		return redirect(303, '/');
	}

	return resolve(event);
};
