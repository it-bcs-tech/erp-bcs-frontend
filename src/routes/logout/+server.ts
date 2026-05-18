import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Endpoint POST /logout
// Menghapus cookie auth_token dari server-side (karena httpOnly)
export const POST: RequestHandler = async ({ cookies, request }) => {
	// Deteksi apakah berjalan di HTTPS agar opsi delete cocok dengan saat set
	const isSecure = request.headers.get('x-forwarded-proto') === 'https';

	cookies.delete('auth_token', {
		path: '/',
		httpOnly: true,
		secure: isSecure,
		sameSite: 'lax'
	});

	return json({ success: true });
};
