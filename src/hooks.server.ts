import { redirect, type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Mengambil token dari cookie (Validasi diurus oleh backend atau saat request ke API)
	const authToken = event.cookies.get('auth_token');
	const isLoginPage = event.url.pathname.startsWith('/login');

	// Jika pengguna belum login dan mencoba mengakses halaman selain login
	if (!authToken && !isLoginPage) {
		throw redirect(303, '/login');
	}

	// Jika pengguna sudah login tapi mencoba mengakses halaman login kembali
	if (authToken && isLoginPage) {
		throw redirect(303, '/');
	}

	return resolve(event);
};
