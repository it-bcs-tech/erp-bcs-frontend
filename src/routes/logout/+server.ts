import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Endpoint POST /logout
// Menghapus cookie auth_token dari server-side (karena httpOnly)
export const POST: RequestHandler = async ({ cookies }) => {
	cookies.delete('auth_token', { path: '/' });
	// Kembalikan JSON agar fetch() di client bisa membaca response dengan benar
	// Tidak menggunakan redirect() karena fetch() di belakang Docker/Nginx
	// tidak bisa mendeteksi redirect dengan andal
	return json({ success: true });
};
