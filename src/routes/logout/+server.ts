import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Endpoint POST /logout
// Menghapus semua cookie autentikasi dari server-side
export const POST: RequestHandler = async ({ cookies, request }) => {
	// Deteksi apakah berjalan di HTTPS agar opsi delete cocok dengan saat set
	const isSecure = request.headers.get('x-forwarded-proto') === 'https';

	// Hapus auth token (httpOnly)
	cookies.delete('auth_token', {
		path: '/',
		httpOnly: true,
		secure: isSecure,
		sameSite: 'lax'
	});

	// Hapus user data (non-httpOnly)
	cookies.delete('user_data', {
		path: '/',
		httpOnly: false,
		secure: isSecure,
		sameSite: 'lax'
	});

	return json({ success: true });
};
