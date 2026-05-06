import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Endpoint POST /logout
// Menghapus cookie auth_token dari server-side (karena httpOnly)
export const POST: RequestHandler = async ({ cookies }) => {
	cookies.delete('auth_token', { path: '/' });
	throw redirect(303, '/login');
};
